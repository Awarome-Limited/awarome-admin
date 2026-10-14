'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { resolveSupportTicket } from '../actions';

export interface DropMoney {
  feeMode: 'inclusive' | 'added';
  amountKobo: number;
  deliveryFeeKobo: number;
  collectKobo: number;
  collectionFeePercent: number;
  collectionFeeCapKobo: number;
}

const naira = (kobo: number) =>
  `₦${(kobo / 100).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

/**
 * Mirrors businessMoney in awarome-BE (businesses/utils/money.ts) so ops sees
 * what the receiver will pay and what the business keeps before saving. The
 * backend works it out again and is the one that counts.
 */
function preview(money: DropMoney, amountKobo: number) {
  const collectKobo =
    money.feeMode === 'added' ? amountKobo + money.deliveryFeeKobo : amountKobo;
  const fee = Math.min(
    Math.round((collectKobo * money.collectionFeePercent) / 100),
    money.collectionFeeCapKobo
  );
  return { collectKobo, fee, netKobo: collectKobo - money.deliveryFeeKobo - fee };
}

export function ResolveTicketDialog({
  id,
  reference,
  type,
  decision,
  money,
}: {
  id: string;
  reference: string;
  type: string;
  decision: 'approve' | 'decline' | 'resolve';
  money?: DropMoney | null;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  // Starts at the amount as it stands; ops changes it to what was agreed.
  const [amount, setAmount] = useState(() =>
    money ? String(money.amountKobo / 100) : ''
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const changingAmount = decision === 'approve' && type === 'amount-change';
  const amountKobo = Math.round(Number(amount) * 100);
  const amountValid = Number.isFinite(amountKobo) && amountKobo > 0;
  const computed = useMemo(
    () => (money && amountValid ? preview(money, amountKobo) : null),
    [money, amountKobo, amountValid]
  );

  const title =
    decision === 'resolve'
      ? `Resolve ${reference}?`
      : decision === 'decline'
        ? `Decline ${reference}?`
        : type === 'cash-payment'
          ? `Let the receiver pay cash?`
          : `Set the new amount`;

  function submit() {
    setError(null);
    if (changingAmount && (!amountValid || (computed && computed.netKobo <= 0))) {
      setError('The amount must be more than the delivery and payment collection fees.');
      return;
    }
    startTransition(async () => {
      const result = await resolveSupportTicket(id, {
        decision,
        note: note.trim() || undefined,
        ...(changingAmount ? { amount: amountKobo / 100 } : {}),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(
        decision === 'approve'
          ? `${reference} approved`
          : decision === 'decline'
            ? `${reference} declined`
            : `${reference} resolved`
      );
      setOpen(false);
      setNote('');
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            variant={decision === 'decline' ? 'outline' : 'default'}
            disabled={isPending}
          />
        }
      >
        {decision === 'approve'
          ? type === 'amount-change'
            ? 'Approve & set amount'
            : 'Approve cash'
          : decision === 'decline'
            ? 'Decline'
            : 'Mark resolved'}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {decision === 'resolve' &&
              'Closes the report. The rider is told support has dealt with it.'}
            {decision === 'decline' &&
              (type === 'cash-payment'
                ? 'The receiver still has to pay by transfer. The rider is told straight away.'
                : 'The amount stays as booked. The rider is told straight away.')}
            {decision === 'approve' &&
              type === 'cash-payment' &&
              `The drop stops waiting for a transfer. The rider collects ${
                money ? naira(money.collectKobo) : 'the amount'
              } in cash, and it is recorded against their wallet until they pay it in. The business's fees stay as booked.`}
            {changingAmount &&
              'Agree the new price with the receiver and the business first, then set the item amount as the business would have typed it. The rider and the business both see the new figures straight away.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {changingAmount && money && (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`amount-${id}`}>New item amount (₦)</Label>
                <Input
                  id={`amount-${id}`}
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                />
                <span className="text-[12.5px] text-muted-foreground">
                  Currently {naira(money.amountKobo)}
                  {money.feeMode === 'added'
                    ? `, plus the ${naira(money.deliveryFeeKobo)} delivery fee the receiver pays on top.`
                    : ', delivery fee included.'}
                </span>
              </div>
              {computed && (
                <div className="grid grid-cols-3 gap-3 rounded-[10px] border border-border p-3">
                  <Fact label="Receiver pays" value={naira(computed.collectKobo)} />
                  <Fact
                    label="Fees"
                    value={naira(money.deliveryFeeKobo + computed.fee)}
                  />
                  <Fact
                    label="Business gets"
                    value={computed.netKobo > 0 ? naira(computed.netKobo) : '—'}
                  />
                </div>
              )}
            </>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor={`note-${id}`}>Note (optional)</Label>
            <Input
              id={`note-${id}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                decision === 'decline'
                  ? 'What the rider should tell the receiver'
                  : 'What was agreed'
              }
              maxLength={500}
            />
            {decision !== 'resolve' && (
              <span className="text-[12.5px] text-muted-foreground">
                {changingAmount
                  ? 'Shown to the rider and the business.'
                  : 'Shown to the rider.'}
              </span>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Back
          </Button>
          <Button
            type="button"
            variant={decision === 'decline' ? 'destructive' : 'default'}
            onClick={submit}
            disabled={isPending || (changingAmount && !amountValid)}
          >
            {decision === 'approve'
              ? changingAmount
                ? `Approve — receiver pays ${computed ? naira(computed.collectKobo) : ''}`
                : 'Approve cash'
              : decision === 'decline'
                ? 'Decline'
                : 'Mark resolved'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-[13.5px] font-semibold tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
}
