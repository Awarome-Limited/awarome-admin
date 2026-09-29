'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import type { VendorCommission } from '@/lib/types';
import { createVendorCommission, endVendorCommission } from '../../../vendor-payouts/actions';

const lagosToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(new Date());

const displayDay = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const staffName = (s?: VendorCommission['createdBy']) =>
  s ? [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email || 'Staff' : '—';

const inputClass =
  'h-9 rounded-[9px] border border-border-strong bg-card px-3 text-[13px] font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring';

/**
 * The commercial terms a vendor is paid on. Each agreement is a percentage
 * Awarome keeps from the price of the vendor's products, for a date range —
 * 0% is "paid full cost". Changing terms means adding a new agreement: the one
 * it replaces is ended the day before, and both stay in the history.
 */
export function VendorCommissions({
  vendorId,
  agreements,
  canEdit,
}: {
  vendorId: string;
  agreements: VendorCommission[];
  canEdit: boolean;
}) {
  const current = agreements.find((a) => a.active);

  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pb-3 pt-[18px]">
        <div>
          <div className="text-[15px] font-semibold text-foreground">Commission</div>
          <p className="mt-1 max-w-xl text-[13px] text-muted-foreground">
            {current
              ? current.percent === 0
                ? 'Paid full cost for their products.'
                : `Awarome keeps ${current.percent}% of the price of their products.`
              : 'No agreement on file — paid full cost for their products.'}{' '}
            Each order is paid on the terms in force when the customer paid for it. Orders already
            credited keep the terms they were credited at.
          </p>
        </div>
        {canEdit && <AddCommissionDialog vendorId={vendorId} />}
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Commission</TableHead>
              <TableHead>From</TableHead>
              <TableHead>Until</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Note</TableHead>
              <TableHead>Set by</TableHead>
              {canEdit && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {agreements.map((a) => (
              <TableRow key={a._id}>
                <TableCell className="font-semibold tabular-nums">
                  {a.percent === 0 ? 'Full cost (0%)' : `${a.percent}%`}
                </TableCell>
                <TableCell className="whitespace-nowrap">{displayDay(a.startDate)}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {a.endDate ? displayDay(a.endDate) : 'No end date'}
                </TableCell>
                <TableCell>
                  {a.active ? (
                    <Badge variant="positive" dot>Active</Badge>
                  ) : a.upcoming ? (
                    <Badge variant="info" dot>Upcoming</Badge>
                  ) : (
                    <Badge variant="secondary">Ended</Badge>
                  )}
                </TableCell>
                <TableCell className="max-w-[220px] truncate text-muted-foreground" title={a.note}>
                  {a.note || '—'}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {staffName(a.createdBy)}
                  {a.endedBy && (
                    <span className="block text-[11.5px]">ended by {staffName(a.endedBy)}</span>
                  )}
                </TableCell>
                {canEdit && (
                  <TableCell className="text-right">
                    {(a.active || a.upcoming) && (
                      <EndCommissionDialog vendorId={vendorId} agreement={a} />
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
            {agreements.length === 0 && (
              <TableRow>
                <TableCell colSpan={canEdit ? 7 : 6} className="py-8 text-center text-muted-foreground">
                  No commission agreements yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function AddCommissionDialog({ vendorId }: { vendorId: string }) {
  const [open, setOpen] = useState(false);
  const [percentValue, setPercentValue] = useState('');
  const [startDate, setStartDate] = useState(lagosToday);
  const [endDate, setEndDate] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const pct = Number(percentValue);
  const valid = percentValue !== '' && pct >= 0 && pct <= 100 && !!startDate;

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await createVendorCommission(vendorId, {
        percent: pct,
        startDate,
        endDate: endDate || null,
        note: note.trim() || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(result.message ?? 'Commission saved');
      setOpen(false);
      setPercentValue('');
      setEndDate('');
      setNote('');
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Set commission</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New commission agreement</DialogTitle>
          <DialogDescription>
            The share of the price of this vendor&apos;s products Awarome keeps. Use 0% for a vendor
            paid full cost. An agreement already running on the start date ends the day before.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="commission-percent">Commission</Label>
            <div className="flex items-center gap-2">
              <input
                id="commission-percent"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={percentValue}
                onChange={(e) => setPercentValue(e.target.value)}
                placeholder="e.g. 10"
                className={`${inputClass} w-28 tabular-nums`}
                autoFocus
              />
              <span className="text-[13px] font-semibold text-muted-foreground">%</span>
              {percentValue !== '' && pct === 0 && (
                <span className="text-[12.5px] text-muted-foreground">Paid full cost</span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="commission-start">Start date</Label>
              <input
                id="commission-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="commission-end">End date (optional)</Label>
              <input
                id="commission-end"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <span className="-mt-2 text-[12.5px] text-muted-foreground">
            Leave the end date empty for an agreement that runs until it is replaced. Both dates are
            inclusive, in Lagos time.
          </span>
          <div className="flex flex-col gap-2">
            <Label htmlFor="commission-note">Note (optional)</Label>
            <input
              id="commission-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Q4 renegotiation"
              maxLength={500}
              className={inputClass}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={isPending || !valid}>
            {isPending ? 'Saving…' : 'Save agreement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EndCommissionDialog({ vendorId, agreement }: { vendorId: string; agreement: VendorCommission }) {
  const [open, setOpen] = useState(false);
  const [endDate, setEndDate] = useState(() => {
    const today = lagosToday();
    return today < agreement.startDate ? agreement.startDate : today;
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await endVendorCommission(vendorId, agreement._id, endDate);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success('Agreement end date saved');
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        {agreement.endDate ? 'Change end' : 'End'}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>End the {agreement.percent}% agreement</DialogTitle>
          <DialogDescription>
            The last day this commission applies. After it, the vendor is paid full cost unless
            another agreement starts.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="commission-end-date">Last day</Label>
          <input
            id="commission-end-date"
            type="date"
            value={endDate}
            min={agreement.startDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={inputClass}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={isPending || !endDate}>
            {isPending ? 'Saving…' : 'Save end date'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
