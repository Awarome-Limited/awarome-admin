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
import { cancelJob } from '@/lib/cancel-job-action';

/**
 * Ops calling a run off from its detail page.
 *
 * The reason is required and free text: nothing else on this path records why,
 * and a cancelled delivery that can't say why is a support ticket waiting to
 * happen. It is stamped on the job alongside the agent who typed it.
 */
export function CancelJobDialog({
  jobType,
  id,
  reference,
  amount,
  isPaid,
  hasRider,
  batchId,
}: {
  jobType: 'order' | 'delivery';
  id: string;
  reference: string;
  amount: number;
  isPaid: boolean;
  hasRider?: boolean;
  batchId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [refund, setRefund] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSubmit = reason.trim().length >= 3;

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await cancelJob(jobType, id, { reason: reason.trim(), refund });
        setOpen(false);
        setReason('');
        setRefund(false);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Could not cancel that.'
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button size="sm" variant="destructive" disabled={isPending} />}
      >
        Cancel {jobType}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel {reference}?</DialogTitle>
          <DialogDescription>
            Ends this run. The customer is notified straight away
            {hasRider ? ', and the rider is told to stop' : ''}.
            {batchId
              ? ' The rest of the batch keeps running — only this stop comes off the trip.'
              : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`reason-${id}`}>Reason (required)</Label>
            <Input
              id={`reason-${id}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this being cancelled?"
              maxLength={500}
              autoFocus
            />
            <span className="text-[12.5px] text-muted-foreground">
              Saved on the delivery with your name against it.
            </span>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-[10px] border border-border p-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor={`refund-${id}`}>Owe the customer a refund</Label>
              <span className="text-[12.5px] text-muted-foreground">
                {isPaid
                  ? `Adds ₦${amount.toLocaleString()} to the refunds queue, where the money is moved by hand.`
                  : 'Never paid for, so there is nothing to refund.'}
              </span>
            </div>
            <Switch
              id={`refund-${id}`}
              checked={refund}
              onCheckedChange={setRefund}
              disabled={!isPaid || isPending}
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
            variant="destructive"
            onClick={submit}
            disabled={isPending || !canSubmit}
          >
            Cancel this {jobType}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
