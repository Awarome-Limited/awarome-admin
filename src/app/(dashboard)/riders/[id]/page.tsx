import Link from 'next/link';
import { notFound } from 'next/navigation';
import { authedFetch, ApiError, SingleResponse, PaginatedResponse } from '@/lib/api-client';
import { AdminRider, AdminOrder } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { AccountStatusControl, StatusPill } from '@/components/account-status';
import {
  DetailHeader,
  EmptyRow,
  FactList,
  InlineNotice,
  PageStack,
  Panel,
  RowLink,
  StatCards,
  type StatCardData,
} from '@/components/page';
import { AvatarInitials } from '@/components/avatar-initials';
import { Badge } from '@/components/ui/badge';
import { PaginationControls } from '@/components/pagination-controls';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { formatDate, formatPhone, humanize, statusBadgeVariant } from '@/lib/format';
import { RiderDocuments } from '@/components/rider-documents';
import { getRiderPosition, setRiderSuspended } from '../actions';
import { RiderLocationMap } from '@/components/rider-location-map';
import { riderPosition } from '@/lib/rider-position';
import type { RiderLedgerEntry, RiderPayoutSummary } from '@/lib/types';
import { getSession } from '@/lib/session';
import { hasPermission, PermissionAction, PermissionModule } from '@/lib/permissions';
import { payRiderNow, recordRiderBankPayout } from '../../payouts/actions';
import { RecordBankPayoutDialog } from '../../payouts/_components/record-bank-payout-dialog';
import { PayoutActionButton } from '../../payouts/_components/payout-action-button';
import { naira, payoutStatusLabel, payoutStatusVariant } from '../../payouts/payout-format';
import type { RiderCollectionAccount } from '@/lib/types';
import { RiderCollectionAccountCard } from './_components/collection-account';
import { AdjustBalanceDialog } from './_components/adjust-balance-dialog';
import { WalletLedger } from './_components/wallet-ledger';

const LIMIT = 10;
const LEDGER_LIMIT = 15;

export default async function RiderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const skip = Number(query.skip ?? 0);
  const ledgerSkip = Number(query.wskip ?? 0);

  let rider: AdminRider;
  let orders: PaginatedResponse<AdminOrder>;
  try {
    const result = await authedFetch<SingleResponse<AdminRider>>(
      `/riders/admin/${id}`
    );
    rider = result.data;
    orders = await authedFetch<PaginatedResponse<AdminOrder>>(
      `/riders/admin/${id}/orders?skip=${skip}&limit=${LIMIT}`
    );
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) {
      notFound();
    }
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Something went wrong.'}
      />
    );
  }

  // Payout data sits behind the payments permission, which ops staff who can
  // see riders may not have — the card is simply left out for them.
  const session = await getSession();
  const canViewPayouts =
    !!session && hasPermission(session.profile, PermissionModule.PAYMENTS, PermissionAction.VIEW);
  const canPay =
    !!session && hasPermission(session.profile, PermissionModule.PAYMENTS, PermissionAction.UPDATE);
  const [payoutSummary, ledger] = canViewPayouts
    ? await Promise.all([
        authedFetch<SingleResponse<RiderPayoutSummary>>(`/admins/payouts/riders/${id}/summary`)
          .then((r) => r.data)
          .catch(() => null),
        authedFetch<PaginatedResponse<RiderLedgerEntry>>(
          `/admins/payouts/riders/${id}/ledger?skip=${ledgerSkip}&limit=${LEDGER_LIMIT}`
        ).catch(() => null),
      ])
    : [null, null];

  const canUpdateRider =
    !!session && hasPermission(session.profile, PermissionModule.RIDERS, PermissionAction.UPDATE);
  const collectionAccount = await authedFetch<SingleResponse<RiderCollectionAccount | null>>(
    `/riders/admin/${id}/collection-account`
  )
    .then((r) => r.data)
    .catch(() => null);

  const verificationStatus =
    rider.verificationStatus || (rider.suspended ? 'rejected' : 'unsubmitted');
  // Matched to the approvals table rather than statusBadgeVariant, which has no
  // hint for 'approved' and would render it neutral grey here but green there.
  const verificationVariant =
    verificationStatus === 'approved'
      ? 'positive'
      : verificationStatus === 'rejected'
        ? 'destructive'
        : verificationStatus === 'pending'
          ? 'info'
          : 'secondary';
  const verificationLabel =
    verificationStatus === 'pending'
      ? 'Waiting for review'
      : verificationStatus === 'unsubmitted'
        ? 'Not submitted'
        : humanize(verificationStatus);

  const name = [rider.firstName, rider.lastName].filter(Boolean).join(' ');
  const owes = payoutSummary && payoutSummary.balance < 0 ? -payoutSummary.balance : 0;

  const stats: StatCardData[] = [
    {
      label: 'Completed jobs',
      value: (rider.ordersCompleted ?? 0).toLocaleString(),
      meta: `${orders.totalCount.toLocaleString()} in order history`,
    },
  ];
  if (payoutSummary) {
    stats.push(
      owes > 0
        ? {
            label: 'Owes Awarome',
            value: naira(owes),
            progress: payoutSummary.threshold ? owes / payoutSummary.threshold : undefined,
            meta: payoutSummary.locked
              ? `Over the ${naira(payoutSummary.threshold ?? 0)} limit, locked out of jobs`
              : `of ${naira(payoutSummary.threshold ?? 0)} limit`,
          }
        : { label: 'Balance to pay out', value: naira(payoutSummary.balance), meta: 'Earned, not yet paid' },
      {
        label: 'Paid to date',
        value: naira(payoutSummary.totalPaid),
        meta: payoutSummary.lastPaidAt
          ? `Last payout ${formatDate(payoutSummary.lastPaidAt)}`
          : 'No payouts yet',
      }
    );
  }
  stats.push({
    label: 'Verification',
    value: verificationLabel,
    meta: rider.verificationNote || (verificationStatus === 'approved' ? 'Can receive jobs' : undefined),
  });

  return (
    <PageStack>
      <DetailHeader
        back={{ href: '/riders', label: 'All riders' }}
        avatar={<AvatarInitials name={name || undefined} size="lg" />}
        title={name || 'No name yet'}
        status={<StatusPill suspended={!!rider.suspended} />}
        meta={[
          rider.vehicleType && humanize(rider.vehicleType),
          rider.status && humanize(rider.status),
          rider.createdAt && `Rider since ${formatDate(rider.createdAt).split(',')[0]}`,
        ]}
        actions={
          canUpdateRider && (
            <AccountStatusControl
              noun="rider"
              suspended={!!rider.suspended}
              action={setRiderSuspended.bind(null, rider._id)}
            />
          )
        }
      />

      <StatCards stats={stats} />

      {payoutSummary?.locked && (
        <InlineNotice>
          {name || 'This rider'} owes {naira(owes)}, over the {naira(payoutSummary.threshold ?? 0)} limit,
          so they won’t be offered new jobs until they fund their wallet.
        </InlineNotice>
      )}

      <section className="grid items-start gap-4 lg:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-4">
          <Panel title="Profile">
            <FactList
              facts={[
                { label: 'Email', value: rider.email || 'No email' },
                { label: 'Phone', value: formatPhone(rider.phone) },
                {
                  label: 'Presence',
                  value: rider.status ? (
                    <Badge variant={statusBadgeVariant(rider.status)} dot>
                      {humanize(rider.status)}
                    </Badge>
                  ) : (
                    '—'
                  ),
                },
                { label: 'Vehicle', value: humanize(rider.vehicleType) },
                { label: 'Plate number', value: rider.plateNumber ? rider.plateNumber.toUpperCase() : '—' },
                {
                  label: 'Verification',
                  value: (
                    <Badge variant={verificationVariant} dot>
                      {verificationLabel}
                    </Badge>
                  ),
                },
                ...(rider.verificationNote ? [{ label: 'Verification note', value: rider.verificationNote }] : []),
              ]}
            />
          </Panel>

          <Panel title="Current location">
            <RiderLocationMap
              initial={riderPosition(rider)}
              load={getRiderPosition.bind(null, rider._id)}
            />
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Panel
            flush
            title="Recent jobs"
            aside={
              <span className="text-[13px] text-muted-foreground tabular-nums">
                {orders.totalCount.toLocaleString()} total
              </span>
            }
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.data.map((order) => (
                    <TableRow key={order._id} className="relative">
                      <TableCell className="tabular-nums">
                        <RowLink href={`/orders/${order._id}`}>{order.orderId}</RowLink>
                        <div className="text-[12.5px] text-muted-foreground">{formatDate(order.createdAt)}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(order.status)} dot>
                          {humanize(order.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(order.orderDeliveryStatus)} dot>
                          {humanize(order.orderDeliveryStatus)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        ₦ {(order.totalPrice ?? 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {orders.data.length === 0 && (
                    <EmptyRow colSpan={4} title="No jobs yet" body="Jobs this rider completes show up here." />
                  )}
                </TableBody>
              </Table>
            </div>
            {orders.totalCount > LIMIT && (
              <div className="border-t border-border px-6 py-3.5">
                <PaginationControls
                  skip={skip}
                  limit={LIMIT}
                  totalCount={orders.totalCount}
                  basePath={`/riders/${id}`}
                  searchParams={query}
                />
              </div>
            )}
          </Panel>

          {payoutSummary && (
            <Panel
              title="Payouts"
              aside={
                canPay && (
                  <div className="flex flex-wrap items-center gap-2">
                    <AdjustBalanceDialog riderId={rider._id} owed={payoutSummary.owed ?? 0} />
                    {!payoutSummary.inFlight && payoutSummary.balance > 0 && (
                      <RecordBankPayoutDialog
                        payee="this courier"
                        owed={payoutSummary.balance}
                        action={recordRiderBankPayout.bind(null, rider._id)}
                      />
                    )}
                    {!payoutSummary.inFlight &&
                      payoutSummary.balance >= 100 &&
                      payoutSummary.bankAccount?.verified && (
                        <PayoutActionButton
                          label={`Pay ${naira(payoutSummary.balance)} now`}
                          title="Pay this courier now?"
                          description={`${naira(payoutSummary.balance)} — their whole balance — is sent by Paystack transfer to ${payoutSummary.bankAccount.bankName} •••• ${payoutSummary.bankAccount.accountNumber?.slice(-4)} (${payoutSummary.bankAccount.accountName}).`}
                          confirmLabel="Send payout"
                          successMessage="Payout sent to Paystack"
                          action={payRiderNow.bind(null, rider._id)}
                        />
                      )}
                  </div>
                )
              }
            >
              {payoutSummary.balance < 0 && (
                <p className="-mt-2 text-[13px] text-foreground-secondary">
                  Commission on pay-on-delivery runs the courier collected themselves. It clears as they
                  fund their wallet or earn on card and bank-transfer jobs.
                </p>
              )}
              <FactList
                columns={2}
                facts={[
                  {
                    label: 'Payout account',
                    value: payoutSummary.bankAccount?.accountNumber ? (
                      <span className="flex flex-wrap items-center gap-2">
                        {payoutSummary.bankAccount.bankName} · {payoutSummary.bankAccount.accountNumber}
                        {payoutSummary.bankAccount.verified ? (
                          <Badge variant="positive">Verified</Badge>
                        ) : (
                          <Badge variant="warning">Not verified</Badge>
                        )}
                      </span>
                    ) : (
                      <Badge variant="warning">Not set</Badge>
                    ),
                  },
                  { label: 'Account name', value: payoutSummary.bankAccount?.accountName || '—' },
                  {
                    label: 'In flight',
                    value: payoutSummary.inFlight ? (
                      <Link
                        href={`/payouts/${payoutSummary.inFlight._id}`}
                        className="inline-flex items-center gap-2 hover:text-primary"
                      >
                        {naira(payoutSummary.inFlight.amount)}
                        <Badge variant={payoutStatusVariant(payoutSummary.inFlight.status)}>
                          {payoutStatusLabel(payoutSummary.inFlight.status)}
                        </Badge>
                      </Link>
                    ) : (
                      'Nothing in flight'
                    ),
                  },
                  {
                    label: 'Paid to date',
                    value: `${naira(payoutSummary.totalPaid)} · ${payoutSummary.payoutsCount} ${payoutSummary.payoutsCount === 1 ? 'payout' : 'payouts'}`,
                  },
                ]}
              />
              {payoutSummary.bankAccount && !payoutSummary.bankAccount.verified && (
                <InlineNotice>
                  This account was saved before bank verification, so automatic payouts skip it. The
                  courier needs to re-save it in the app.
                </InlineNotice>
              )}
              <Link
                href={`/payouts?rider=${rider._id}`}
                className="text-[13.5px] font-medium text-primary hover:text-warning"
              >
                Payout history
              </Link>
            </Panel>
          )}

          {ledger && (
            <Panel
              flush
              title="Wallet activity"
              aside={
                <span className="text-[13px] text-muted-foreground tabular-nums">
                  {ledger.totalCount.toLocaleString()} {ledger.totalCount === 1 ? 'entry' : 'entries'}
                </span>
              }
            >
              <WalletLedger entries={ledger.data} />
              {ledger.totalCount > LEDGER_LIMIT && (
                <div className="border-t border-border px-6 py-3.5">
                  <PaginationControls
                    skip={ledgerSkip}
                    limit={LEDGER_LIMIT}
                    totalCount={ledger.totalCount}
                    basePath={`/riders/${id}`}
                    searchParams={query}
                    skipParam="wskip"
                  />
                </div>
              )}
            </Panel>
          )}

          <Panel title="Wallet funding account">
            <RiderCollectionAccountCard
              riderId={rider._id}
              account={collectionAccount}
              canUpdate={canUpdateRider}
            />
          </Panel>

          <Panel title="Verification documents">
            <RiderDocuments documents={rider.documents} />
          </Panel>
        </div>
      </section>
    </PageStack>
  );
}
