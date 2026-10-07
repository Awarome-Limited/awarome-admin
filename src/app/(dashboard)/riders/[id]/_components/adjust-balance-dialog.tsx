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
import { adjustRiderBalance } from '../../../payouts/actions';

const inputClass =
  'h-9 rounded-[9px] border border-border-strong bg-card px-3 text-[13px] font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring';

const naira = (n: number) => `₦${Math.abs(n).toLocaleString('en-NG')}`;

/**
 * Credit or debit a courier's wallet by hand, with a reason that stays on the
 * ledger. The usual use is writing off commission owed on pay-on-delivery
 * runs; a credit clears debt exactly as a top-up would.
 */
export function AdjustBalanceDialog({ riderId, owed }: { riderId: string; owed: number }) {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<'credit' | 'debit'>('credit');
  const [amountValue, setAmountValue] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const amount = Number(amountValue);
  const valid = amountValue !== '' && amount > 0 && reason.trim().length >= 3;
  const signed = direction === 'credit' ? amount : -amount;

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await adjustRiderBalance(riderId, { amount: signed, reason: reason.trim() });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(`${direction === 'credit' ? 'Credited' : 'Debited'} ${naira(amount)}`);
      setOpen(false);
      setAmountValue('');
      setReason('');
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Adjust balance</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust courier balance</DialogTitle>
          <DialogDescription>
            A credit clears commission the courier owes, the same as a wallet top-up. A debit takes
            money off their balance. Both are kept on their ledger with your reason.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            {(['credit', 'debit'] as const).map((d) => (
              <Button
                key={d}
                type="button"
                size="sm"
                variant={direction === d ? 'default' : 'outline'}
                onClick={() => setDirection(d)}
              >
                {d === 'credit' ? 'Credit courier' : 'Debit courier'}
              </Button>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="adjust-amount">Amount</Label>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-muted-foreground">₦</span>
              <input
                id="adjust-amount"
                type="number"
                min={1}
                step="any"
                value={amountValue}
                onChange={(e) => setAmountValue(e.target.value)}
                placeholder={owed > 0 ? String(owed) : 'e.g. 500'}
                className={`${inputClass} w-36 tabular-nums`}
                autoFocus
              />
              {owed > 0 && direction === 'credit' && (
                <button
                  type="button"
                  onClick={() => setAmountValue(String(owed))}
                  className="text-[12.5px] font-semibold text-primary hover:underline"
                >
                  Clear all {naira(owed)}
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="adjust-reason">Reason</Label>
            <input
              id="adjust-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Paid commission in cash at the hub"
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
            {isPending ? 'Saving…' : direction === 'credit' ? `Credit ${amount > 0 ? naira(amount) : ''}` : `Debit ${amount > 0 ? naira(amount) : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
