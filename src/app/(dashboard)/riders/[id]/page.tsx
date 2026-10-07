import Link from 'next/link';
import { notFound } from 'next/navigation';
import { authedFetch, ApiError, SingleResponse, PaginatedResponse } from '@/lib/api-client';
import { AdminRider, AdminOrder } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DetailRow } from '@/components/detail-row';
import { SuspendToggle } from '@/components/suspend-toggle';
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
import { formatDate, statusBadgeVariant } from '@/lib/format';
import { RiderDocuments } from '@/components/rider-documents';
import { getRiderPosition, setRiderSuspended } from '../actions';
import { RiderLocationMap } from '@/components/rider-location-map';
import { riderPosition } from '@/lib/rider-position';
import type { RiderPayoutSummary } from '@/lib/types';
import { getSession } from '@/lib/session';
import { hasPermission, PermissionAction, PermissionModule } from '@/lib/permissions';
import { payRiderNow } from '../../payouts/actions';
import { PayoutActionButton } from '../../payouts/_components/payout-action-button';
import { naira, payoutStatusLabel, payoutStatusVariant } from '../../payouts/payout-format';
import type { RiderCollectionAccount } from '@/lib/types';
import { RiderCollectionAccountCard } from './_components/collection-account';
import { AdjustBalanceDialog } from './_components/adjust-balance-dialog';

const LIMIT = 10;

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
  const payoutSummary = canViewPayouts
    ? await authedFetch<SingleResponse<RiderPayoutSummary>>(
        `/admins/payouts/riders/${id}/summary`
      )
        .then((r) => r.data)
        .catch(() => null)
    : null;

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
          ? 'warning'
          : 'secondary';

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div className="flex items-center gap-3.5">
        <AvatarInitials name={`${rider.firstName ?? ''} ${rider.lastName ?? ''}`} size="lg" />
        <h1 className="text-[22px] font-bold tracking-tight">
          {rider.firstName} {rider.lastName}
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <DetailRow label="Email" value={rider.email} />
          <DetailRow label="Phone" value={rider.phone} />
          <DetailRow
            label="Online status"
            value={<Badge variant={statusBadgeVariant(rider.status)} dot>{rider.status}</Badge>}
          />
          <DetailRow label="Vehicle" value={rider.vehicleType} />
          <DetailRow label="Plate number" value={rider.plateNumber} />
          <DetailRow label="Orders completed" value={rider.ordersCompleted} />
          <DetailRow
            label="Account status"
            value={
              <SuspendToggle
                suspended={!!rider.suspended}
                action={setRiderSuspended.bind(null, rider._id)}
              />
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current location</CardTitle>
        </CardHeader>
        <CardContent>
          <RiderLocationMap
            initial={riderPosition(rider)}
            load={getRiderPosition.bind(null, rider._id)}
          />
        </CardContent>
      </Card>

      {payoutSummary && (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              Payouts
              {payoutSummary.locked && <Badge variant="destructive">Locked — over debt limit</Badge>}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
            {canPay && <AdjustBalanceDialog riderId={rider._id} owed={payoutSummary.owed ?? 0} />}
            {canPay && !payoutSummary.inFlight && payoutSummary.balance >= 100 && payoutSummary.bankAccount?.verified && (
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
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {payoutSummary.balance < 0 ? (
              <DetailRow
                label="Owes Awarome"
                value={
                  <span className={payoutSummary.locked ? 'font-semibold text-destructive' : 'font-semibold text-warning'}>
                    {naira(-payoutSummary.balance)}
                    <span className="font-normal text-muted-foreground">
                      {' '}of {naira(payoutSummary.threshold ?? 0)} limit
                    </span>
                  </span>
                }
              />
            ) : (
              <DetailRow
                label="Balance owed"
                value={<span className="font-semibold">{naira(payoutSummary.balance)}</span>}
              />
            )}
            {payoutSummary.balance < 0 && (
              <p className="text-[12px] text-muted-foreground">
                Commission on pay-on-delivery runs the courier collected themselves. It clears as they
                fund their wallet or earn on card and bank-transfer jobs.
              </p>
            )}
            <DetailRow
              label="Payout account"
              value={
                payoutSummary.bankAccount?.accountNumber ? (
                  <span className="flex flex-wrap items-center justify-end gap-2">
                    {payoutSummary.bankAccount.bankName} · {payoutSummary.bankAccount.accountNumber}
                    {payoutSummary.bankAccount.verified ? (
                      <Badge variant="positive">Verified</Badge>
                    ) : (
                      <Badge variant="warning">Not verified</Badge>
                    )}
                  </span>
                ) : (
                  'None added'
                )
              }
            />
            {payoutSummary.bankAccount?.accountName && (
              <DetailRow label="Account name" value={payoutSummary.bankAccount.accountName} />
            )}
            {payoutSummary.inFlight && (
              <DetailRow
                label="In flight"
                value={
                  <Link href={`/payouts/${payoutSummary.inFlight._id}`} className="flex items-center gap-2 hover:underline">
                    {naira(payoutSummary.inFlight.amount)}
                    <Badge variant={payoutStatusVariant(payoutSummary.inFlight.status)}>
                      {payoutStatusLabel(payoutSummary.inFlight.status)}
                    </Badge>
                  </Link>
                }
              />
            )}
            <DetailRow
              label="Paid to date"
              value={`${naira(payoutSummary.totalPaid)} · ${payoutSummary.payoutsCount} ${payoutSummary.payoutsCount === 1 ? 'payout' : 'payouts'}`}
            />
            <DetailRow label="Last paid" value={payoutSummary.lastPaidAt ? formatDate(payoutSummary.lastPaidAt) : '—'} />
            {payoutSummary.bankAccount && !payoutSummary.bankAccount.verified && (
              <p className="text-[12px] text-warning">
                This account was saved before bank verification, so automatic payouts skip it. The
                courier needs to re-save it in the app.
              </p>
            )}
            <Link href={`/payouts?rider=${rider._id}`} className="text-[13px] font-semibold text-primary hover:underline">
              Payout history →
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Wallet funding account</CardTitle>
        </CardHeader>
        <CardContent>
          <RiderCollectionAccountCard
            riderId={rider._id}
            account={collectionAccount}
            canUpdate={canUpdateRider}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Verification documents</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 text-sm">
            <DetailRow
              label="Verification"
              value={
                <Badge variant={verificationVariant} dot className="capitalize">
                  {verificationStatus}
                </Badge>
              }
            />
            {rider.verificationNote && (
              <DetailRow label="Note" value={rider.verificationNote} />
            )}
          </div>
          <RiderDocuments documents={rider.documents} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order history</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Delivery status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.data.map((order) => (
                <TableRow key={order._id}>
                  <TableCell>
                    <span className="rounded bg-chip px-2 py-0.5 font-mono text-xs">
                      {order.orderId}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(order.status)} dot>{order.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(order.orderDeliveryStatus)} dot>
                      {order.orderDeliveryStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    ₦{order.totalPrice?.toLocaleString()}
                  </TableCell>
                  <TableCell>{formatDate(order.createdAt)}</TableCell>
                </TableRow>
              ))}
              {orders.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No orders yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <PaginationControls
            skip={skip}
            limit={LIMIT}
            totalCount={orders.totalCount}
            basePath={`/riders/${id}`}
            searchParams={query}
          />
        </CardContent>
      </Card>
    </div>
  );
}
