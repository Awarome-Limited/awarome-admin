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

type Result = { ok: true } | { ok: false; error: string };

/**
 * Turns down a courier's withdrawal request. The reason is sent to the
 * courier in a push notification, so it is required and written for them.
 */
export function RejectRequestDialog({
  courier,
  amount,
  action,
}: {
  courier: string;
  amount: string;
  action: (reason: string) => Promise<Result>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const valid = reason.trim().length >= 3;

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await action(reason.trim());
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success('Request rejected; the courier has been told');
      setOpen(false);
      setReason('');
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setReason('');
          setError(null);
        }
      }}
    >
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Reject</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject this withdrawal?</DialogTitle>
          <DialogDescription>
            Nothing is sent. The {amount} goes back into {courier}&apos;s balance and they are
            told why.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="reject-reason">Reason, shown to the courier</Label>
          <textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. The account name doesn't match your profile"
            maxLength={300}
            rows={3}
            className="field resize-none"
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            loading={isPending}
            type="button"
            variant="destructive"
            onClick={submit}
            disabled={isPending || !valid}
          >
            {isPending ? 'Rejecting…' : 'Reject request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
