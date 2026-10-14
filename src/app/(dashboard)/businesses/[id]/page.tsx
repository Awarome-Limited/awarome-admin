import Link from 'next/link';
import { notFound } from 'next/navigation';
import { authedFetch, ApiError, SingleResponse } from '@/lib/api-client';
import type { AdminBusinessDelivery, AdminBusinessDetail, AdminBusinessPayout } from '@/lib/types';
import { getSession } from '@/lib/session';
import { hasPermission, PermissionAction, PermissionModule } from '@/lib/permissions';
import { ApiErrorCard } from '@/components/api-error-card';
import { DetailRow } from '@/components/detail-row';
import { SuspendToggle } from '@/components/suspend-toggle';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatNaira } from '@/lib/format';
import { AddMemberDialog } from '../_components/add-member-dialog';
import { FeeModeSelect } from '../_components/fee-mode-select';
import { ResendInviteButton } from '../_components/resend-invite-button';
import { setBusinessSuspended } from '../actions';

const STATUS: Record<AdminBusinessDelivery['status'], { label: string; variant: 'positive' | 'warning' | 'info' | 'destructive' | 'secondary' }> = {
  awaiting_rider: { label: 'Awaiting rider', variant: 'warning' },
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
  const card = 'rounded-[14px] border border-border bg-card p-[22px_24px] shadow-[var(--shadow-card)]';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/businesses" className="text-[13px] text-muted-foreground hover:underline">← Businesses</Link>
          <h1 className="mt-1 text-[23px] font-bold tracking-tight text-foreground">{business.name}</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">{business.pickupAddress?.text}</p>
        </div>
        {canUpdate && (
          <SuspendToggle suspended={business.status === 'suspended'} action={setBusinessSuspended.bind(null, business.id)} />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className={card}>
          <div className="text-[13px] font-medium text-muted-foreground">Wallet balance</div>
          <div className="mt-1 text-[24px] font-bold tabular-nums">{formatNaira(business.wallet.balanceKobo)}</div>
          <div className="mt-1 text-[13px] text-muted-foreground">
            From {business.wallet.deliveries} deliveries · next payout {formatDate(business.wallet.nextPayoutAt)}
          </div>
        </div>
        <div className={card}>
          <div className="text-[13px] font-medium text-muted-foreground">Payout account</div>
          {business.payoutAccount ? (
            <>
              <div className="mt-1 text-[16px] font-semibold">
                {business.payoutAccount.bankName} · {business.payoutAccount.accountNumber ?? `••${business.payoutAccount.last4}`}
              </div>
              <div className="mt-1 text-[13px] text-muted-foreground">{business.payoutAccount.accountName}</div>
            </>
          ) : (
            <div className="mt-2"><Badge variant="warning">Not set — payouts are held until the owner adds one</Badge></div>
          )}
        </div>
        <div className={card}>
          <div className="flex flex-col gap-2 text-[13px]">
            <DetailRow label="Pickup phone" value={business.pickupPhone} />
            <DetailRow
              label="Delivery fee default"
              value={canUpdate ? <FeeModeSelect businessId={business.id} value={business.defaultFeeMode} /> : business.defaultFeeMode}
            />
            <DetailRow label="Onboarded" value={formatDate(business.createdAt)} />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="text-[15px] font-semibold">Team</div>
          {canCreate && <AddMemberDialog businessId={business.id} hasOwner={hasOwner} />}
        </div>
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
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{m.name || '—'}</span>
                    <span className="text-[12px] text-muted-foreground">{m.email}</span>
                  </div>
                </TableCell>
                <TableCell>{ROLE_LABEL[m.role] ?? m.role}</TableCell>
                <TableCell>
                  <Badge variant={m.status === 'active' ? 'positive' : 'warning'}>{m.status === 'active' ? 'Active' : 'Invited'}</Badge>
                </TableCell>
                <TableCell>{m.lastLoginAt ? formatDate(m.lastLoginAt) : '—'}</TableCell>
                <TableCell className="text-right">
                  {canUpdate && m.status === 'invited' && (
                    <ResendInviteButton businessId={business.id} memberId={m.id} email={m.email} />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="px-5 py-4 text-[15px] font-semibold">Recent deliveries</div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Delivery</TableHead>
                <TableHead>Receiver</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Collect</TableHead>
                <TableHead className="text-right">Delivery fee</TableHead>
                <TableHead className="text-right">Paystack fee</TableHead>
                <TableHead className="text-right">Business net</TableHead>
                <TableHead>Booked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <Link href={`/deliveries/${d.id}`} className="font-medium hover:underline">{d.reference}</Link>
                    {d.batchRef && <div className="text-[12px] text-muted-foreground">{d.batchRef}</div>}
                  </TableCell>
                  <TableCell>{d.receiver.name}</TableCell>
                  <TableCell><Badge variant={STATUS[d.status].variant}>{STATUS[d.status].label}</Badge></TableCell>
                  <TableCell className="text-right tabular-nums">{formatNaira(d.money.collectKobo)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNaira(d.money.deliveryFeeKobo)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNaira(d.money.collectionFeeKobo)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNaira(d.money.netKobo)}</TableCell>
                  <TableCell>{formatDate(d.createdAt)}</TableCell>
                </TableRow>
              ))}
              {!deliveries.length && (
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">No deliveries yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="px-5 py-4 text-[15px] font-semibold">Payouts</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Bank</TableHead>
              <TableHead className="text-right">Deliveries</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payouts.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{formatDate(p.createdAt)}</TableCell>
                <TableCell className="font-mono text-[12px]">{p.reference}</TableCell>
                <TableCell>{p.bank.bankName} ••{p.bank.last4}</TableCell>
                <TableCell className="text-right tabular-nums">{p.deliveryCount}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNaira(p.amountKobo)}</TableCell>
                <TableCell>
                  <Badge variant={p.status === 'success' ? 'positive' : p.status === 'pending' ? 'warning' : 'destructive'}>{p.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {!payouts.length && (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No payouts yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
