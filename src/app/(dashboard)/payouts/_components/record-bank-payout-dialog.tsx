'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import type { OfflinePayoutPayload } from '@/lib/types';

type Result = { ok: true } | { ok: false; error: string };

const inputClass =
  'h-9 rounded-[9px] border border-border-strong bg-card px-3 text-[13px] font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring';

const naira = (n: number) => `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

/** Today in Lagos as YYYY-MM-DD, for the date input. */
const lagosToday = () =>
  new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 10);

/**
 * Records money already sent from Awarome's own bank account, outside
 * Paystack. Nothing is transferred: the payout is saved as paid and the
 * balance goes down. Riders and vendors can be part-paid; a business is
 * always paid its whole wallet (`fixedAmount`).
 */
export function RecordBankPayoutDialog({
  payee,
  owed,
  fixedAmount = false,
  action,
}: {
  payee: string;
  /** Naira owed now. */
  owed: number;
  fixedAmount?: boolean;
  action: (payload: OfflinePayoutPayload) => Promise<Result>;
}) {
  const [open, setOpen] = useState(false);
  const [amountValue, setAmountValue] = useState('');
  const [paidOn, setPaidOn] = useState(lagosToday());
  const [bankReference, setBankReference] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const amount = fixedAmount || amountValue === '' ? owed : Number(amountValue);
  const valid = amount > 0 && amount <= owed && !!paidOn;

  const reset = () => {
    setAmountValue('');
    setPaidOn(lagosToday());
    setBankReference('');
    setNote('');
    setError(null);
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const today = paidOn === lagosToday();
      const result = await action({
        ...(fixedAmount || amountValue === '' ? {} : { amount }),
        // A past day is recorded at noon Lagos; today is recorded as now.
        ...(today ? {} : { paidAt: new Date(`${paidOn}T12:00:00+01:00`).toISOString() }),
        bankReference: bankReference.trim(),
        note: note.trim(),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(`Bank payout of ${naira(amount)} recorded`);
      setOpen(false);
      reset();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button size="sm" variant="outline" disabled={owed <= 0} />}>
        Record bank payout
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record a payout from our bank</DialogTitle>
          <DialogDescription>
            For money already sent to {payee} from Awarome&apos;s bank account. Nothing is
            transferred here: the payout is saved as paid and{' '}
            {fixedAmount
              ? 'every delivery in their wallet is marked paid out.'
              : 'their balance goes down by the amount.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="bank-payout-amount">Amount paid</Label>
            {fixedAmount ? (
              <div className="text-[15px] font-semibold tabular-nums">
                {naira(owed)}
                <span className="ml-2 text-[12.5px] font-normal text-muted-foreground">
                  the whole wallet — record a payout only once you have sent this exact amount
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-muted-foreground">₦</span>
                <input
                  id="bank-payout-amount"
                  type="number"
                  min={1}
                  max={owed}
                  step="any"
                  value={amountValue}
                  onChange={(e) => setAmountValue(e.target.value)}
                  placeholder={String(owed)}
                  className={`${inputClass} w-36 tabular-nums`}
                  autoFocus
                />
                <span className="text-[12.5px] text-muted-foreground">of {naira(owed)} owed</span>
              </div>
            )}
            {!fixedAmount && amount > owed && (
              <p className="text-[12.5px] text-destructive">That is more than is owed.</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="bank-payout-date">Date paid</Label>
            <input
              id="bank-payout-date"
              type="date"
              value={paidOn}
              max={lagosToday()}
              onChange={(e) => setPaidOn(e.target.value)}
              className={`${inputClass} w-44`}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="bank-payout-ref">Bank reference</Label>
            <input
              id="bank-payout-ref"
              value={bankReference}
              onChange={(e) => setBankReference(e.target.value)}
              placeholder="From the bank transfer receipt"
              maxLength={100}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="bank-payout-note">Note</Label>
            <input
              id="bank-payout-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Paystack balance was unfunded"
              maxLength={300}
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
            {isPending ? 'Saving…' : `Record ${naira(amount)} paid`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
