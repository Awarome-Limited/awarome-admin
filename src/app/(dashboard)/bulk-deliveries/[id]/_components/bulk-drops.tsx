'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AssignBatchDialog } from '@/components/assign-batch-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { statusBadgeVariant } from '@/lib/format';
import type { AdminRider, BulkDeliveryDrop } from '@/lib/types';
import { settleBulkVendor } from '../../actions';
import { EditDropDialog, type BulkPricingContext } from './edit-dialogs';

const naira = (amount: number) => `₦${Math.round(amount).toLocaleString('en-NG')}`;

const OUTSTANDING = ['pending', 'awaiting-payment', 'processing'];

const isCancelled = (d: BulkDeliveryDrop) => d.status === 'cancelled' || d.status === 'failed';
const isPostpaid = (d: BulkDeliveryDrop) => !!d.payOnDelivery?.postpaid;
const vendorOwes = (d: BulkDeliveryDrop) =>
  isPostpaid(d) && !isCancelled(d) && OUTSTANDING.includes(d.payOnDelivery?.status ?? 'pending');
// Batching only makes sense for drops nobody has picked up yet.
// Details can be corrected until the package changes hands.
const isEditable = (d: BulkDeliveryDrop) => !isCancelled(d) && d.riderStatus !== 'delivered';
const isBatchable = (d: BulkDeliveryDrop) =>
  !isCancelled(d) && !d.rider && (d.riderStatus ?? 'pending') === 'pending';

function paymentLabel(d: BulkDeliveryDrop): { text: string; variant: ReturnType<typeof statusBadgeVariant> } {
  const status = d.payOnDelivery?.status ?? 'pending';
  if (isCancelled(d)) return { text: 'Cancelled', variant: 'outline' };
  if (status === 'paid' || status === 'collected') return { text: 'Paid', variant: 'positive' };
  if (status === 'waived') return { text: 'Waived', variant: 'outline' };
  if (status === 'failed') return { text: 'Not paid', variant: 'destructive' };
  if (isPostpaid(d)) return { text: 'Vendor owes', variant: 'warning' };
  if (status === 'awaiting-payment') return { text: 'Awaiting transfer', variant: 'warning' };
  if (status === 'processing') return { text: 'Confirming', variant: 'warning' };
  return { text: 'Collect at door', variant: 'info' };
}

function riderName(rider: BulkDeliveryDrop['rider']) {
  if (!rider || typeof rider === 'string') return null;
  return [rider.firstName, rider.lastName].filter(Boolean).join(' ') || null;
}

export function BulkDrops({
  bulkId,
  drops,
  riders,
  vehicleType,
  canUpdate,
  pricing,
}: {
  bulkId: string;
  drops: BulkDeliveryDrop[];
  riders: AdminRider[];
  vehicleType: string;
  canUpdate: boolean;
  pricing: BulkPricingContext;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const chosen = useMemo(() => drops.filter((d) => selected.has(d._id)), [drops, selected]);
  const batchable = chosen.filter(isBatchable);
  const owed = chosen.filter(vendorOwes);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectWhere = (predicate: (d: BulkDeliveryDrop) => boolean) =>
    setSelected(new Set(drops.filter(predicate).map((d) => d._id)));

  return (
    <div className="flex flex-col">
      {canUpdate && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
            <span className="text-muted-foreground">Select:</span>
            <button type="button" className="font-semibold text-primary hover:underline" onClick={() => selectWhere(isBatchable)}>
              Waiting for a rider
            </button>
            <button
              type="button"
              className="font-semibold text-primary hover:underline"
              onClick={() => selectWhere((d) => vendorOwes(d) && d.riderStatus === 'delivered')}
            >
              Delivered & owed
            </button>
            {selected.size > 0 && (
              <button type="button" className="text-muted-foreground hover:underline" onClick={() => setSelected(new Set())}>
                Clear ({selected.size})
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {batchable.length > 0 && (
              <AssignBatchDialog
                riders={riders}
                vehicleType={vehicleType}
                label={`Assign ${batchable.length} to a rider`}
                summary={`${batchable.length} ${batchable.length === 1 ? 'drop' : 'drops'} from this bulk, run as one batch.`}
                payload={{
                  jobs: batchable.map((d) => ({ jobType: 'delivery' as const, id: d._id })),
                  bulkId,
                }}
              />
            )}
            {owed.length > 0 && <SettleDialog bulkId={bulkId} drops={owed} />}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border text-left text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
              {canUpdate && (
                <th className="w-10 px-4 py-2">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={selected.size === drops.length && drops.length > 0}
                    onChange={(e) => setSelected(e.target.checked ? new Set(drops.map((d) => d._id)) : new Set())}
                    className="size-4 accent-[var(--primary)]"
                  />
                </th>
              )}
              <th className="w-8 px-2 py-2">#</th>
              <th className="px-2 py-2">Receiver</th>
              <th className="px-2 py-2">Drop-off</th>
              <th className="px-2 py-2 text-right">Km</th>
              <th className="px-2 py-2 text-right">Amount</th>
              <th className="px-2 py-2">Payment</th>
              <th className="px-2 py-2">Delivery</th>
              <th className="px-2 py-2">Run · Rider</th>
              {canUpdate && <th className="w-10 px-2 py-2" />}
            </tr>
          </thead>
          <tbody>
            {drops.map((d, i) => {
              const payment = paymentLabel(d);
              const amount = d.payOnDelivery?.amountDue ?? d.deliveryFee ?? 0;
              const listed = d.bulkPricing?.listedFee;
              return (
                <tr key={d._id} className="border-b border-border align-top last:border-0">
                  {canUpdate && (
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        aria-label={`Select drop ${i + 1}`}
                        checked={selected.has(d._id)}
                        onChange={() => toggle(d._id)}
                        className="size-4 accent-[var(--primary)]"
                      />
                    </td>
                  )}
                  <td className="px-2 py-2.5 tabular-nums text-muted-foreground">{i + 1}</td>
                  <td className="px-2 py-2.5">
                    <div className="font-semibold text-foreground">{d.receiver?.name || '—'}</div>
                    <div className="text-[12px] text-muted-foreground">{d.receiver?.phone}</div>
                    <Link href={`/deliveries/${d._id}`} className="font-mono text-[11px] text-primary hover:underline">
                      {d.deliveryId}
                    </Link>
                  </td>
                  <td className="max-w-[280px] px-2 py-2.5">
                    <div className="line-clamp-2">{d.dropoffAddress?.address || '—'}</div>
                    {d.note && <div className="mt-0.5 text-[12px] text-muted-foreground">Note: {d.note}</div>}
                  </td>
                  <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground">
                    {d.estimatedDistance ?? '—'}
                    {d.bulkPricing?.far && (
                      <div className="text-[11px] font-semibold text-warning">far</div>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-right tabular-nums">
                    <div className="font-semibold">{naira(amount)}</div>
                    {listed != null && listed !== amount && (
                      <div className="text-[11px] text-muted-foreground">tariff {naira(listed)}</div>
                    )}
                  </td>
                  <td className="px-2 py-2.5">
                    <Badge variant={payment.variant} dot>
                      {payment.text}
                    </Badge>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {isPostpaid(d) ? 'Vendor pays after' : 'Receiver pays'}
                    </div>
                    {!!d.payOnDelivery?.amountReceived && payment.text !== 'Paid' && (
                      <div className="text-[11px] font-semibold text-warning">
                        {naira(d.payOnDelivery.amountReceived)} of {naira(amount)} received
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2.5">
                    <Badge variant={statusBadgeVariant(isCancelled(d) ? d.status : d.riderStatus)} dot>
                      {isCancelled(d) ? d.status : d.riderStatus || 'pending'}
                    </Badge>
                  </td>
                  <td className="px-2 py-2.5 text-[12.5px]">
                    {d.batchId ? (
                      <Link href={`/batches/${d.batchId}`} className="font-mono text-[11px] text-primary hover:underline">
                        {d.batchId.split('-').slice(0, 3).join('-')}
                      </Link>
                    ) : (
                      <span className="text-[11.5px] text-muted-foreground">Not in a run</span>
                    )}
                    <div>{riderName(d.rider) ?? <span className="text-muted-foreground">No rider yet</span>}</div>
                  </td>
                  {canUpdate && (
                    <td className="px-2 py-1.5">{isEditable(d) && <EditDropDialog bulkId={bulkId} drop={d} pricing={pricing} />}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettleDialog({ bulkId, drops }: { bulkId: string; drops: BulkDeliveryDrop[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [method, setMethod] = useState<'external' | 'wallet'>('external');
  const [isPending, startTransition] = useTransition();
  const total = drops.reduce((t, d) => t + (d.payOnDelivery?.amountDue ?? d.deliveryFee ?? 0), 0);
  const undelivered = drops.filter((d) => d.riderStatus !== 'delivered').length;

  function confirm() {
    startTransition(async () => {
      const result = await settleBulkVendor(bulkId, {
        deliveryIds: drops.map((d) => d._id),
        note: note.trim() || undefined,
        method,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${naira(total)} recorded as paid`);
      setOpen(false);
      setNote('');
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        Mark {naira(total)} paid
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record vendor payment</DialogTitle>
          <DialogDescription>
            Marks {drops.length} postpaid {drops.length === 1 ? 'drop' : 'drops'} as paid, {naira(total)} in
            total.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {(
            [
              ['external', 'They paid Awarome directly', 'Bank transfer or cash to the company. Records it only.'],
              [
                'wallet',
                'Take it from their Awarome wallet',
                'For vendors who transferred to their own Awarome account number, which tops up their wallet.',
              ],
            ] as const
          ).map(([value, title, hint]) => (
            <label
              key={value}
              className={`flex cursor-pointer gap-2.5 rounded-[10px] border px-3 py-2.5 ${
                method === value ? 'border-primary bg-brand-tint2' : 'border-input'
              }`}
            >
              <input
                type="radio"
                name="settle-method"
                checked={method === value}
                onChange={() => setMethod(value)}
                className="mt-0.5 accent-[var(--primary)]"
              />
              <span className="flex flex-col">
                <span className="text-[13px] font-semibold">{title}</span>
                <span className="text-[12px] text-muted-foreground">{hint}</span>
              </span>
            </label>
          ))}
        </div>
        {undelivered > 0 && (
          <p className="rounded-[10px] bg-warning-bg px-3 py-2 text-[12.5px]">
            {undelivered} of these {undelivered === 1 ? 'hasn’t' : 'haven’t'} been delivered yet.
          </p>
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="settle-note" className="text-[13px] font-medium">
            Reference or note (optional)
          </label>
          <input
            id="settle-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. GTB transfer 14:32, ref 0021…"
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={isPending}>
            {isPending ? 'Saving…' : `Mark ${naira(total)} paid`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
