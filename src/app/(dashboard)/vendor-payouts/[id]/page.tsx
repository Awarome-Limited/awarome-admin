import Link from 'next/link';
import { notFound } from 'next/navigation';
import { authedFetch, ApiError, SingleResponse } from '@/lib/api-client';
import { ApiErrorCard } from '@/components/api-error-card';
import { AvatarInitials } from '@/components/avatar-initials';
import { DetailRow } from '@/components/detail-row';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { formatDate, statusBadgeVariant } from '@/lib/format';
import { DetailHeader, InlineNotice, PageStack } from '@/components/page';
import { getSession } from '@/lib/session';
import { hasPermission, PermissionAction, PermissionModule } from '@/lib/permissions';
import type { AdminVendorPayout, PayoutRunRef, RiderPayoutEvent } from '@/lib/types';
import { PayoutActionButton, PayoutQuickAction } from '../../payouts/_components/payout-action-button';
import {
  naira,
  payoutStatusLabel,
  payoutStatusVariant,
  payoutTriggerLabel,
  percent,
  personName,
  vendorName,
} from '../../payouts/payout-format';
import { payVendorNow, refreshVendorPayout } from '../actions';

const IN_FLIGHT = ['processing', 'awaiting-otp'];

const SOURCE_LABELS: Record<RiderPayoutEvent['source'], string> = {
  system: 'Awarome',
  paystack: 'Paystack API',
  webhook: 'Paystack webhook',
  verify: 'Status check',
};

export default async function VendorPayoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let payout: AdminVendorPayout;
  try {
    const result = await authedFetch<SingleResponse<AdminVendorPayout>>(`/admins/vendor-payouts/${id}`);
    payout = result.data;
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Something went wrong.'}
      />
    );
  }

  const session = await getSession();
  const canPay = !!session && hasPermission(session.profile, PermissionModule.PAYMENTS, PermissionAction.UPDATE);

  const vendor = payout.vendor;
  const run = typeof payout.run === 'object' ? (payout.run as PayoutRunRef | null) : null;
  const transaction = typeof payout.transaction === 'object' ? payout.transaction : null;
  const staff = typeof payout.initiatedBy === 'object' ? payout.initiatedBy : null;
  const inFlight = IN_FLIGHT.includes(payout.status);
  const bank = payout.bankAccount ?? {};
  const currentBank = vendor?.bankAccount;
  const accountChanged =
    !!currentBank?.accountNumber &&
    (currentBank.accountNumber !== bank.accountNumber || currentBank.bankCode !== bank.bankCode);
  const history = [...(payout.history ?? [])].reverse();
  const earnings = payout.earnings ?? [];
  const totals = earnings.reduce(
    (sum, e) => ({
      gross: sum.gross + e.grossAmount,
      commission: sum.commission + e.commissionAmount,
      net: sum.net + e.amount,
    }),
    { gross: 0, commission: 0, net: 0 }
  );
  const released = ['failed', 'reversed'].includes(payout.status);

  return (
    <PageStack>
      <DetailHeader
        back={{ href: '/vendor-payouts', label: 'All vendor payouts' }}
        title={<span className="tabular-nums">{naira(payout.amount)}</span>}
        status={
          <Badge variant={payoutStatusVariant(payout.status)} dot>
            {payoutStatusLabel(payout.status)}
          </Badge>
        }
        meta={[
          payoutTriggerLabel(payout.trigger),
          `To ${vendorName(vendor, 'a deleted vendor')}`,
          `${payout.earningsCount ?? earnings.length} ${(payout.earningsCount ?? earnings.length) === 1 ? 'order' : 'orders'}`,
          `Created ${formatDate(payout.createdAt)}`,
          payout.completedAt && `Settled ${formatDate(payout.completedAt)}`,
        ]}
        actions={
          <>
            {inFlight && (
              <PayoutQuickAction
                label="Check status with Paystack"
                successMessage="Status refreshed"
                action={refreshVendorPayout.bind(null, payout._id)}
              />
            )}
            {canPay && vendor && !inFlight && payout.status !== 'success' && (
              <PayoutActionButton
                label="Pay vendor now"
                title="Send this vendor's balance now?"
                description="A new transfer is made for the vendor's whole current balance — which includes this payout's amount, since a failed or reversed payout returns to their balance — to the account currently on their profile."
                confirmLabel="Send payout"
                successMessage="Payout sent to Paystack"
                action={payVendorNow.bind(null, vendor._id)}
              />
            )}
          </>
        }
      />

      {payout.status === 'awaiting-otp' && (
        <InlineNotice>
          Paystack is holding this transfer for an OTP. Finalise it from the Paystack dashboard, and turn off
          transfer OTP (Settings → Preferences) so daily payouts go through on their own.
        </InlineNotice>
      )}
      {payout.failureReason && (
        <InlineNotice>
          <strong className="font-semibold">{payout.status === 'reversed' ? 'Reversed: ' : 'Failed: '}</strong>
          {payout.failureReason}. The amount is back in the vendor’s balance and goes out with their next payout.
        </InlineNotice>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Orders in this payout</CardTitle>
            </CardHeader>
            <CardContent>
              {released ? (
                <span className="text-[13px] text-muted-foreground">
                  These orders were released back to the vendor&apos;s balance when the payout{' '}
                  {payout.status === 'reversed' ? 'was reversed' : 'failed'}, and will be covered by their next payout.
                </span>
              ) : earnings.length === 0 ? (
                <span className="text-[13px] text-muted-foreground">No orders recorded against this payout.</span>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead className="text-right">Items</TableHead>
                        <TableHead className="text-right">Products</TableHead>
                        <TableHead className="text-right">Commission</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead>Picked up</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {earnings.map((e) => (
                        <TableRow key={e._id}>
                          <TableCell>
                            {e.order ? (
                              <Link href={`/orders/${e.order}`} className="font-medium tabular-nums hover:underline">
                                {e.orderId ?? e.order}
                              </Link>
                            ) : (
                              e.orderId ?? '—'
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">{e.items ?? '—'}</TableCell>
                          <TableCell className="text-right tabular-nums">{naira(e.grossAmount)}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {e.commissionAmount ? `−${naira(e.commissionAmount)} (${percent(e.commissionPercent)})` : '—'}
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">{naira(e.amount)}</TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(e.pickedUpAt)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell className="font-semibold">Total</TableCell>
                        <TableCell />
                        <TableCell className="text-right font-semibold tabular-nums">{naira(totals.gross)}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {totals.commission ? `−${naira(totals.commission)}` : '—'}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{naira(totals.net)}</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <span className="text-[13px] text-muted-foreground">No events recorded.</span>
              ) : (
                <ol className="flex flex-col gap-4">
                  {history.map((event, index) => (
                    <li key={`${event.at}-${index}`} className="flex gap-3">
                      <span className={`mt-1.5 size-2 shrink-0 rounded-full ${index === 0 ? 'bg-primary' : 'bg-border-strong'}`} />
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={payoutStatusVariant(event.status)}>{payoutStatusLabel(event.status)}</Badge>
                          <span className="text-[12px] text-muted-foreground">
                            {SOURCE_LABELS[event.source] ?? event.source} · {formatDate(event.at)}
                          </span>
                        </div>
                        {event.note && <span className="text-[13px] text-foreground-secondary">{event.note}</span>}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transfer</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <DetailRow label="Reference" value={<span className="tabular-nums text-xs">{payout.reference}</span>} />
              {payout.trigger === 'offline' && (
                <>
                  <DetailRow label="Paid from" value="Awarome's bank account" />
                  <DetailRow label="Bank reference" value={payout.bankReference ? <span className="tabular-nums text-xs">{payout.bankReference}</span> : '—'} />
                  <DetailRow label="Note" value={payout.note || '—'} />
                </>
              )}
              <DetailRow label="Paystack transfer code" value={payout.transferCode ? <span className="tabular-nums text-xs">{payout.transferCode}</span> : '—'} />
              <DetailRow label="Paystack transfer ID" value={payout.paystackTransferId ?? '—'} />
              <DetailRow label="Recipient code" value={payout.recipientCode ? <span className="tabular-nums text-xs">{payout.recipientCode}</span> : '—'} />
              <DetailRow label="Narration" value={payout.reason} />
              <DetailRow label="Sent to Paystack" value={payout.sentAt ? formatDate(payout.sentAt) : '—'} />
              <DetailRow label="Settled" value={payout.completedAt ? formatDate(payout.completedAt) : '—'} />
              {payout.gatewayResponse != null && (
                <details className="pt-1">
                  <summary className="cursor-pointer text-[13px] font-semibold text-primary">Last Paystack response</summary>
                  <pre className="mt-3 max-h-[420px] overflow-auto rounded-lg bg-muted p-3 font-mono text-[12px] leading-relaxed">
                    {JSON.stringify(payout.gatewayResponse, null, 2)}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Vendor</CardTitle>
            </CardHeader>
            <CardContent>
              {vendor ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <AvatarInitials name={vendorName(vendor)} size="default" />
                    <div className="min-w-0">
                      <Link href={`/vendors/${vendor._id}`} className="text-[14px] font-semibold text-foreground hover:underline">
                        {vendorName(vendor)}
                      </Link>
                      <div className="text-[12px] text-muted-foreground">{vendor.phone || vendor.email || '—'}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {vendor.suspended && <Badge variant="destructive">Suspended</Badge>}
                    {vendor.deleted && <Badge variant="destructive">Deleted</Badge>}
                  </div>
                  <Link href={`/vendor-payouts?vendor=${vendor._id}`} className="text-[13px] font-semibold text-primary hover:text-warning">
                    All payouts to this vendor →
                  </Link>
                </div>
              ) : (
                <span className="text-[13px] text-muted-foreground">This vendor no longer exists.</span>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Paid to</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <DetailRow label="Bank" value={bank.bankName} />
              <DetailRow label="Bank code" value={bank.bankCode} />
              <DetailRow label="Account number" value={<span className="tabular-nums">{bank.accountNumber ?? '—'}</span>} />
              <DetailRow label="Account name" value={bank.accountName} />
              {accountChanged && (
                <p className="text-[12px] text-warning">
                  The vendor has since changed their payout account to {currentBank?.bankName} ••••{' '}
                  {currentBank?.accountNumber?.slice(-4)}.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bookkeeping</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <DetailRow
                label="Ledger entry"
                value={
                  transaction ? (
                    <Badge variant={statusBadgeVariant(transaction.status)} className="capitalize">
                      {transaction.status}
                    </Badge>
                  ) : (
                    '—'
                  )
                }
              />
              <DetailRow
                label="Run"
                value={
                  run ? (
                    <Link href={`/vendor-payouts/runs/${run._id}`} className="text-primary hover:text-warning">
                      {run.trigger === 'scheduled' ? `Daily · ${run.runKey.replace(/^vendor-/, '')}` : 'Manual run'}
                    </Link>
                  ) : (
                    'Single payout'
                  )
                }
              />
              <DetailRow label="Started by" value={staff ? personName(staff) : 'Scheduler'} />
            </CardContent>
          </Card>
        </div>
      </div>
    </PageStack>
  );
}
