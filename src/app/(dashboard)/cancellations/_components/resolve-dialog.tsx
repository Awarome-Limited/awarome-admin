'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { resolveCancellation } from '../actions';

/**
 * Ops answering one request. Two decisions, deliberately separate:
 *
 *  - Cancel the run, or send the rider back to finish it.
 *  - Whether the customer is owed money. Cancelling does not imply a refund —
 *    what was collected, and why the run died, decide that — so the refund
 *    switch is off until someone turns it on, and all it does is add the
 *    customer to the refunds queue where the money is moved by hand.
 */
export function ResolveDialog({
  jobType,
  id,
  reference,
  customer,
  amount,
  isPaid,
  batchId,
  decision,
}: {
  jobType: 'order' | 'delivery';
  id: string;
  reference: string;
  customer: string;
  amount: number;
  isPaid: boolean;
  batchId?: string;
  decision: 'approve' | 'decline';
}) {
  const [open, setOpen] = useState(false);
  const [refund, setRefund] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const approving = decision === 'approve';

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await resolveCancellation(jobType, id, {
          decision,
          refund: approving && refund,
          note: note.trim() || undefined,
        });
        setOpen(false);
        setNote('');
        setRefund(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save that.');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            variant={approving ? 'destructive' : 'outline'}
            disabled={isPending}
          />
        }
      >
        {approving ? 'Cancel run' : 'Send back'}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {approving ? `Cancel ${reference}?` : `Decline this request?`}
          </DialogTitle>
          <DialogDescription>
            {approving ? (
              <>
                Ends this run for {customer}. The rider is freed for other work
                and still has the package — arrange its return with them.
                {batchId
                  ? ' The rest of the batch keeps running; only this stop comes off the trip.'
                  : ''}
              </>
            ) : (
              <>
                The run stays with the rider and they are asked to complete it.
                Nothing changes for {customer}.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {approving && (
            <div className="flex items-start justify-between gap-4 rounded-[10px] border border-border p-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor={`refund-${id}`}>Owe the customer a refund</Label>
                <span className="text-[12.5px] text-muted-foreground">
                  {isPaid
                    ? `Adds ₦${amount.toLocaleString()} to the refunds queue. The money still gets moved by hand there.`
                    : 'This run was never paid for, so there is nothing to refund.'}
                </span>
              </div>
              <Switch
                id={`refund-${id}`}
                checked={refund}
                onCheckedChange={setRefund}
                disabled={!isPaid || isPending}
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor={`note-${id}`}>Note (optional)</Label>
            <Input
              id={`note-${id}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                approving
                  ? 'What was agreed with the rider'
                  : 'What the rider was told'
              }
              maxLength={500}
            />
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
            variant={approving ? 'destructive' : 'default'}
            onClick={submit}
            disabled={isPending}
          >
            {approving ? 'Cancel this run' : 'Decline request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
