import Link from 'next/link';
import { notFound } from 'next/navigation';
import { authedFetch, ApiError, SingleResponse } from '@/lib/api-client';
import { ApiErrorCard } from '@/components/api-error-card';
import { AvatarInitials } from '@/components/avatar-initials';
import { DetailRow } from '@/components/detail-row';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, statusBadgeVariant } from '@/lib/format';
import { DetailHeader, InlineNotice, PageStack } from '@/components/page';
import { getSession } from '@/lib/session';
import { hasPermission, PermissionAction, PermissionModule } from '@/lib/permissions';
import type { AdminRiderPayout, PayoutRunRef, RiderPayoutEvent } from '@/lib/types';
import { payRiderNow, refreshPayout } from '../actions';
import { PayoutActionButton, PayoutQuickAction } from '../_components/payout-action-button';
import {
  naira,
  payoutStatusLabel,
  payoutStatusVariant,
  payoutTriggerLabel,
  personName,
} from '../payout-format';

const IN_FLIGHT = ['processing', 'awaiting-otp'];

const SOURCE_LABELS: Record<RiderPayoutEvent['source'], string> = {
  system: 'Awarome',
  paystack: 'Paystack API',
  webhook: 'Paystack webhook',
  verify: 'Status check',
};

export default async function PayoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let payout: AdminRiderPayout;
  try {
    const result = await authedFetch<SingleResponse<AdminRiderPayout>>(`/admins/payouts/${id}`);
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

  const rider = payout.rider;
  const run = typeof payout.run === 'object' ? (payout.run as PayoutRunRef | null) : null;
  const transaction = typeof payout.transaction === 'object' ? payout.transaction : null;
  const staff = typeof payout.initiatedBy === 'object' ? payout.initiatedBy : null;
  const inFlight = IN_FLIGHT.includes(payout.status);
  const bank = payout.bankAccount ?? {};
  const currentBank = rider?.bankAccount;
  const accountChanged =
    !!currentBank?.accountNumber &&
    (currentBank.accountNumber !== bank.accountNumber || currentBank.bankCode !== bank.bankCode);
  const history = [...(payout.history ?? [])].reverse();

  return (
    <PageStack>
      <DetailHeader
        back={{ href: '/payouts', label: 'All rider payouts' }}
        title={<span className="tabular-nums">{naira(payout.amount)}</span>}
        status={
          <Badge variant={payoutStatusVariant(payout.status)} dot>
            {payoutStatusLabel(payout.status)}
          </Badge>
        }
        meta={[
          payoutTriggerLabel(payout.trigger),
          `To ${personName(rider, 'a deleted courier')}`,
          `Created ${formatDate(payout.createdAt)}`,
          payout.completedAt && `Settled ${formatDate(payout.completedAt)}`,
        ]}
        actions={
          <>
            {inFlight && (
              <PayoutQuickAction
                label="Check status with Paystack"
                successMessage="Status refreshed"
                action={refreshPayout.bind(null, payout._id)}
              />
            )}
            {canPay && rider && !inFlight && payout.status !== 'success' && (
              <PayoutActionButton
                label="Pay courier now"
                title="Send this courier's balance now?"
                description="A new transfer is made for the courier's whole current balance — which includes this payout's amount, since a failed or reversed payout returns to their balance — to the account currently on their profile."
                confirmLabel="Send payout"
                successMessage="Payout sent to Paystack"
                action={payRiderNow.bind(null, rider._id)}
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
          {payout.failureReason}. The amount is back in the courier’s balance and goes out with their next payout.
        </InlineNotice>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Transfer</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <DetailRow label="Amount" value={<span className="font-semibold tabular-nums">{naira(payout.amount)}</span>} />
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
                      <span
                        className={`mt-1.5 size-2 shrink-0 rounded-full ${index === 0 ? 'bg-primary' : 'bg-border-strong'}`}
                      />
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

          {payout.gatewayResponse != null && (
            <Card>
              <CardHeader>
                <CardTitle>Last Paystack response</CardTitle>
              </CardHeader>
              <CardContent>
                <details>
                  <summary className="cursor-pointer text-[13px] font-semibold text-primary">Show raw payload</summary>
                  <pre className="mt-3 max-h-[420px] overflow-auto rounded-lg bg-muted p-3 font-mono text-[12px] leading-relaxed">
                    {JSON.stringify(payout.gatewayResponse, null, 2)}
                  </pre>
                </details>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Courier</CardTitle>
            </CardHeader>
            <CardContent>
              {rider ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <AvatarInitials name={personName(rider)} size="default" />
                    <div className="min-w-0">
                      <Link href={`/riders/${rider._id}`} className="text-[14px] font-semibold text-foreground hover:underline">
                        {personName(rider)}
                      </Link>
                      <div className="text-[12px] text-muted-foreground">{rider.phone || rider.email || '—'}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {rider.isInHouse && <Badge variant="secondary">In-house</Badge>}
                    {rider.suspended && <Badge variant="destructive">Suspended</Badge>}
                    {rider.deleted && <Badge variant="destructive">Account deleted</Badge>}
                  </div>
                  <Link href={`/payouts?rider=${rider._id}`} className="text-[13px] font-semibold text-primary hover:text-warning">
                    All payouts to this courier →
                  </Link>
                </div>
              ) : (
                <span className="text-[13px] text-muted-foreground">This courier no longer exists.</span>
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
                  The courier has since changed their payout account to {currentBank?.bankName} ••••{' '}
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
                    <Link href={`/payouts/runs/${run._id}`} className="text-primary hover:text-warning">
                      {run.trigger === 'scheduled' ? `Daily · ${run.runKey}` : 'Manual run'}
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
