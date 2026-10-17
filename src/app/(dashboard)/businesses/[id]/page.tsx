import Link from 'next/link';
import { notFound } from 'next/navigation';
import { authedFetch, ApiError, SingleResponse } from '@/lib/api-client';
import type { AdminBusinessDelivery, AdminBusinessDetail, AdminBusinessPayout } from '@/lib/types';
import { getSession } from '@/lib/session';
import { hasPermission, PermissionAction, PermissionModule } from '@/lib/permissions';
import { ApiErrorCard } from '@/components/api-error-card';
import { AccountStatusControl, StatusPill } from '@/components/account-status';
import { AvatarInitials } from '@/components/avatar-initials';
import {
  DetailHeader,
  EmptyRow,
  FactList,
  InlineNotice,
  PageStack,
  Panel,
  RowLink,
  StatCards,
} from '@/components/page';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatNaira, formatPhone, humanize } from '@/lib/format';
import { AddMemberDialog } from '../_components/add-member-dialog';
import { FeeModeSelect } from '../_components/fee-mode-select';
import { BatchRoutingSelect } from '../_components/batch-routing-select';
import { ResendInviteButton } from '../_components/resend-invite-button';
import { setBusinessSuspended } from '../actions';
import { PayoutActionButton } from '../../payouts/_components/payout-action-button';
import { payBusinessNow, recordBusinessBankPayout } from '../../business-payouts/actions';
import { RecordBankPayoutDialog } from '../../payouts/_components/record-bank-payout-dialog';

const STATUS: Record<AdminBusinessDelivery['status'], { label: string; variant: 'positive' | 'warning' | 'info' | 'destructive' | 'secondary' }> = {
  awaiting_rider: { label: 'Waiting for a rider', variant: 'warning' },
  assigned: { label: 'Rider assigned', variant: 'info' },
  picked_up: { label: 'Picked up', variant: 'info' },
  in_transit: { label: 'In transit', variant: 'info' },
  delivered: { label: 'Delivered', variant: 'positive' },
  failed: { label: 'Failed', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'secondary' },
};
const ROLE_LABEL: Record<string, string> = { owner: 'Owner', admin: 'Admin', dispatcher: 'Dispatcher', finance: 'Finance' };

async function safe<T>(url: string): Promise<T[]> {
  try {
    const r = await authedFetch<{ data: T[] }>(url);
    return r.data ?? [];
  } catch {
    return [];
  }
}

export default async function BusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const canUpdate = !!session && hasPermission(session.profile, PermissionModule.BUSINESSES, PermissionAction.UPDATE);
  const canCreate = !!session && hasPermission(session.profile, PermissionModule.BUSINESSES, PermissionAction.CREATE);
  const canPay = !!session && hasPermission(session.profile, PermissionModule.PAYMENTS, PermissionAction.UPDATE);

  let business: AdminBusinessDetail;
  let deliveries: AdminBusinessDelivery[] = [];
  let payouts: AdminBusinessPayout[] = [];
  try {
    const [b, d, p] = await Promise.all([
      authedFetch<SingleResponse<AdminBusinessDetail>>(`/admins/businesses/${id}`),
      safe<AdminBusinessDelivery>(`/admins/businesses/${id}/deliveries?limit=15`),
      safe<AdminBusinessPayout>(`/admins/businesses/${id}/payouts?limit=10`),
    ]);
    business = b.data;
    deliveries = d;
    payouts = p;
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    return <ApiErrorCard message={error instanceof ApiError ? error.message : 'Something went wrong.'} />;
  }

  const hasOwner = business.members.some((m) => m.role === 'owner');
  const feeModeLabel = humanize(business.defaultFeeMode);

  return (
    <PageStack>
      <DetailHeader
        back={{ href: '/businesses', label: 'All businesses' }}
        avatar={<AvatarInitials name={business.name || undefined} size="lg" shape="store" />}
        title={business.name}
        status={
          business.status === 'active' || business.status === 'suspended' ? (
            <StatusPill suspended={business.status === 'suspended'} />
          ) : (
            <Badge variant="secondary">{humanize(business.status)}</Badge>
          )
        }
        meta={[business.pickupAddress?.text, `Onboarded ${formatDate(business.createdAt).split(',')[0]}`]}
        actions={
          canUpdate && (
            <AccountStatusControl
              noun="business"
              suspended={business.status === 'suspended'}
              action={setBusinessSuspended.bind(null, business.id)}
            />
          )
        }
      />

      <StatCards
        stats={[
          {
            label: 'Wallet balance',
            value: formatNaira(business.wallet.balanceKobo),
            meta: `From ${business.wallet.deliveries.toLocaleString()} deliveries`,
          },
          {
            label: 'Next payout',
            value: business.payoutAccount ? formatDate(business.wallet.nextPayoutAt).split(',')[0] : 'On hold',
            meta: business.payoutAccount ? 'Daily automatic run' : 'No payout account yet',
          },
          { label: 'Team', value: business.members.length.toLocaleString(), meta: hasOwner ? 'Has an owner' : 'No owner yet' },
          { label: 'Recent deliveries', value: deliveries.length.toLocaleString(), meta: 'Last 15 shown below' },
        ]}
      />

      {!business.payoutAccount && business.wallet.balanceKobo > 0 && (
        <InlineNotice>
          {business.name} has {formatNaira(business.wallet.balanceKobo)} waiting but no payout account, so payouts are
          held until the owner adds one.
        </InlineNotice>
      )}

      <section className="grid items-start gap-4 lg:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-4">
          <Panel
            title="Payouts"
            aside={
              canPay &&
              business.wallet.balanceKobo > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <RecordBankPayoutDialog
                    payee={business.name}
                    owed={business.wallet.balanceKobo / 100}
                    fixedAmount
                    action={recordBusinessBankPayout.bind(null, business.id)}
                  />
                  {business.payoutAccount && (
                    <PayoutActionButton
                      label="Pay now"
                      variant="outline"
                      title={`Pay ${business.name} now?`}
                      description={`Everything in the wallet (${formatNaira(business.wallet.balanceKobo)}), including today's deliveries, is sent by Paystack transfer to ${business.payoutAccount.bankName} ••${business.payoutAccount.last4}, without waiting for the daily run.`}
                      confirmLabel="Send payout"
                      successMessage="Payout sent to Paystack"
                      action={payBusinessNow.bind(null, business.id)}
                    />
                  )}
                </div>
              )
            }
          >
            <FactList
              facts={[
                {
                  label: 'Payout account',
                  value: business.payoutAccount ? (
                    `${business.payoutAccount.bankName} · ${business.payoutAccount.accountNumber ?? `••${business.payoutAccount.last4}`}`
                  ) : (
                    <Badge variant="warning">Not set</Badge>
                  ),
                },
                ...(business.payoutAccount?.accountName
                  ? [{ label: 'Account name', value: business.payoutAccount.accountName }]
                  : []),
              ]}
            />
          </Panel>

          <Panel title="Settings" description="How new bookings from this business are priced and batched.">
            <FactList
              facts={[
                { label: 'Pickup phone', value: formatPhone(business.pickupPhone) },
                {
                  label: 'Delivery fee default',
                  value: canUpdate ? (
                    <FeeModeSelect businessId={business.id} value={business.defaultFeeMode} />
                  ) : (
                    feeModeLabel
                  ),
                },
                {
                  label: 'Batch deliveries',
                  value: canUpdate ? (
                    <BatchRoutingSelect businessId={business.id} value={business.batchRouting ?? 'same_route'} />
                  ) : (business.batchRouting ?? 'same_route') === 'same_route' ? (
                    'Same route only'
                  ) : (
                    'Any route'
                  ),
                },
                { label: 'Onboarded', value: formatDate(business.createdAt) },
              ]}
            />
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Panel
            flush
            title="Team"
            aside={canCreate && <AddMemberDialog businessId={business.id} hasOwner={hasOwner} />}
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last sign-in</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {business.members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <AvatarInitials name={m.name || undefined} />
                          <div className="min-w-0">
                            <div className={m.name ? 'font-medium' : 'font-medium text-muted-foreground'}>
                              {m.name || 'No name yet'}
                            </div>
                            <div className="truncate text-[12.5px] text-muted-foreground">{m.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{ROLE_LABEL[m.role] ?? humanize(m.role)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={m.status === 'active' ? 'positive' : 'info'} dot>
                          {m.status === 'active' ? 'Active' : 'Invited'}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-foreground-secondary tabular-nums">
                        {m.lastLoginAt ? formatDate(m.lastLoginAt) : 'Never'}
                      </TableCell>
                      <TableCell className="text-right">
                        {canUpdate && m.status === 'invited' && (
                          <ResendInviteButton businessId={business.id} memberId={m.id} email={m.email} />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!business.members.length && (
                    <EmptyRow colSpan={5} title="No team yet" body="Add the owner so they can sign in." />
                  )}
                </TableBody>
              </Table>
            </div>
          </Panel>

          <Panel flush title="Recent deliveries">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Delivery</TableHead>
                    <TableHead>Receiver</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead className="text-right">Collect</TableHead>
                    <TableHead className="text-right">Fees</TableHead>
                    <TableHead className="text-right">Business net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries.map((d) => (
                    <TableRow key={d.id} className="relative">
                      <TableCell className="tabular-nums">
                        <RowLink href={`/deliveries/${d.id}`}>{d.reference}</RowLink>
                        <div className="text-[12.5px] text-muted-foreground">
                          {[d.batchRef, formatDate(d.createdAt)].filter(Boolean).join(' · ')}
                        </div>
                      </TableCell>
                      <TableCell>{d.receiver.name}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS[d.status].variant} dot>
                          {STATUS[d.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatNaira(d.money.collectKobo)}</TableCell>
                      <TableCell className="text-right text-foreground-secondary tabular-nums">
                        {formatNaira(d.money.deliveryFeeKobo)}
                        <div className="text-[12.5px] text-muted-foreground">
                          + {formatNaira(d.money.collectionFeeKobo)} Paystack
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatNaira(d.money.netKobo)}</TableCell>
                    </TableRow>
                  ))}
                  {!deliveries.length && (
                    <EmptyRow colSpan={6} title="No deliveries yet" body="Runs this business books show up here." />
                  )}
                </TableBody>
              </Table>
            </div>
          </Panel>

          <Panel
            flush
            title="Payout history"
            aside={
              <Link
                href={`/business-payouts?business=${business.id}`}
                className="text-[13.5px] font-medium text-primary hover:text-warning"
              >
                All payouts
              </Link>
            }
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payout</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead className="text-right">Deliveries</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((p) => (
                    <TableRow key={p.id} className="relative">
                      <TableCell className="tabular-nums">
                        <RowLink href={`/business-payouts/${p.id}`}>{formatDate(p.createdAt)}</RowLink>
                        <div className="text-[12.5px] text-muted-foreground">{p.reference}</div>
                      </TableCell>
                      <TableCell className="text-foreground-secondary">
                        {p.bank.bankName} ••{p.bank.last4}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{p.deliveryCount}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatNaira(p.amountKobo)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={p.status === 'success' ? 'positive' : p.status === 'pending' ? 'info' : 'destructive'}
                          dot
                        >
                          {p.status === 'success' ? 'Paid' : humanize(p.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!payouts.length && (
                    <EmptyRow colSpan={5} title="No payouts yet" body="The daily run pays out whatever is in the wallet." />
                  )}
                </TableBody>
              </Table>
            </div>
          </Panel>
        </div>
      </section>
    </PageStack>
  );
}
