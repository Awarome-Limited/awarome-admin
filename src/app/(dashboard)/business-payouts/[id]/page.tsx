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
import { formatDate, formatNaira } from '@/lib/format';
import { DetailHeader, InlineNotice, PageStack } from '@/components/page';
import { getSession } from '@/lib/session';
import { hasPermission, PermissionAction, PermissionModule } from '@/lib/permissions';
import type { AdminBusinessPayoutRecord, PayoutRunRef } from '@/lib/types';
import { PayoutActionButton, PayoutQuickAction } from '../../payouts/_components/payout-action-button';
import {
  businessPayoutStatusLabel,
  businessPayoutStatusVariant,
  payoutTriggerLabel,
  personName,
} from '../../payouts/payout-format';
import { payBusinessNow, refreshBusinessPayout } from '../actions';

export default async function BusinessPayoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let payout: AdminBusinessPayoutRecord;
  try {
    const result = await authedFetch<SingleResponse<AdminBusinessPayoutRecord>>(`/admins/business-payouts/${id}`);
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

  const business = payout.business;
  const run = typeof payout.run === 'object' ? (payout.run as PayoutRunRef | null) : null;
  const staff = typeof payout.initiatedBy === 'object' ? payout.initiatedBy : null;
  const inFlight = payout.status === 'pending';
  const released = payout.status === 'failed' || payout.status === 'reversed';
  const bank = payout.bankSnapshot ?? {};
  const deliveries = payout.deliveries ?? [];

  return (
    <PageStack>
      <DetailHeader
        back={{ href: '/business-payouts', label: 'All business payouts' }}
        title={<span className="tabular-nums">{formatNaira(payout.amountKobo)}</span>}
        status={
          <Badge variant={businessPayoutStatusVariant(payout.status)} dot>
            {businessPayoutStatusLabel(payout.status)}
          </Badge>
        }
        meta={[
          payoutTriggerLabel(payout.trigger ?? 'scheduled'),
          `To ${business?.name ?? 'a deleted business'}`,
          `${payout.deliveryCount} ${payout.deliveryCount === 1 ? 'delivery' : 'deliveries'}`,
          `Created ${formatDate(payout.createdAt)}`,
          payout.paidAt && `Paid ${formatDate(payout.paidAt)}`,
        ]}
        actions={
          <>
            {inFlight && (
              <PayoutQuickAction
                label="Check status with Paystack"
                successMessage="Status refreshed"
                action={refreshBusinessPayout.bind(null, payout._id)}
              />
            )}
            {canPay && business && released && (
              <PayoutActionButton
                label="Pay business now"
                title="Send this business's wallet now?"
                description="A new transfer is made for everything in the business's wallet — which includes this payout's deliveries, since a failed or reversed payout returns them to the wallet — to the account currently on the business."
                confirmLabel="Send payout"
                successMessage="Payout sent to Paystack"
                action={payBusinessNow.bind(null, business._id)}
              />
            )}
          </>
        }
      />

      {payout.failureReason && (
        <InlineNotice>
          <strong className="font-semibold">{payout.status === 'reversed' ? 'Reversed: ' : 'Failed: '}</strong>
          {payout.failureReason}. The deliveries are back in the business’s wallet and go out with its next payout.
        </InlineNotice>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Deliveries in this payout</CardTitle>
            </CardHeader>
            <CardContent>
              {released ? (
                <span className="text-[13px] text-muted-foreground">
                  These deliveries went back to the business&apos;s wallet when the payout{' '}
                  {payout.status === 'reversed' ? 'was reversed' : 'failed'}, and will be covered by its next payout.
                </span>
              ) : deliveries.length === 0 ? (
                <span className="text-[13px] text-muted-foreground">No deliveries recorded against this payout.</span>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Delivery</TableHead>
                        <TableHead>Receiver</TableHead>
                        <TableHead className="text-right">Collected</TableHead>
                        <TableHead className="text-right">Delivery fee</TableHead>
                        <TableHead className="text-right">Paystack fee</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveries.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell>
                            <Link href={`/deliveries/${d.id}`} className="font-medium tabular-nums hover:underline">
                              {d.reference}
                            </Link>
                          </TableCell>
                          <TableCell>{d.receiver.name}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatNaira(d.money.collectKobo)}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">{formatNaira(d.money.deliveryFeeKobo)}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">{formatNaira(d.money.collectionFeeKobo)}</TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">{formatNaira(d.money.netKobo)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
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
              <DetailRow label="Created" value={formatDate(payout.createdAt)} />
              <DetailRow label="Paid" value={payout.paidAt ? formatDate(payout.paidAt) : '—'} />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Business</CardTitle>
            </CardHeader>
            <CardContent>
              {business ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <AvatarInitials name={business.name} size="default" />
                    <div className="min-w-0">
                      <Link href={`/businesses/${business._id}`} className="text-[14px] font-semibold text-foreground hover:underline">
                        {business.name}
                      </Link>
                      <div className="text-[12px] text-muted-foreground">{business.pickupPhone || '—'}</div>
                    </div>
                  </div>
                  {business.status === 'suspended' && <Badge variant="destructive" className="w-fit">Suspended</Badge>}
                  <Link href={`/business-payouts?business=${business._id}`} className="text-[13px] font-semibold text-primary hover:text-warning">
                    All payouts to this business →
                  </Link>
                </div>
              ) : (
                <span className="text-[13px] text-muted-foreground">This business no longer exists.</span>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bookkeeping</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <DetailRow
                label="Run"
                value={
                  run ? (
                    <Link href={`/business-payouts/runs/${run._id}`} className="text-primary hover:text-warning">
                      {run.trigger === 'scheduled' ? `Daily · ${run.runKey.replace(/^business-/, '')}` : 'Manual run'}
                    </Link>
                  ) : payout.trigger === 'manual-business' ? (
                    'Single payout'
                  ) : (
                    `Daily · ${payout.runKey.replace(/^business-/, '')}`
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
