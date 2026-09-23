'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
import { assignBatch, type AssignBatchPayload } from '@/lib/assign-batch-action';
import type { AdminRider } from '@/lib/types';

export interface AssignBatchWarning {
  message: string;
}

/**
 * Hands a batch to a named courier instead of waiting for dispatch to place
 * it — the whole point being that ops should not sit out a 45-minute wait
 * with a courier standing free.
 *
 * Couriers are listed with their state rather than filtered down to the
 * "available" ones: an offline rider about to start a shift is a perfectly
 * good choice, and hiding them would send ops to WhatsApp instead. The one
 * thing that is filtered is vehicle — a batch runs on one, and offering a car
 * driver a bike run only produces a rejection.
 */
export function AssignBatchDialog({
  riders,
  vehicleType,
  payload,
  summary,
  warning,
  label = 'Assign courier',
  size = 'sm',
}: {
  riders: AdminRider[];
  vehicleType: string;
  payload: Omit<AssignBatchPayload, 'riderId'>;
  summary: string;
  /** Shown before anything is committed — e.g. this beats the booked window. */
  warning?: string;
  label?: string;
  size?: 'sm' | 'default';
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [riderId, setRiderId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const eligible = riders.filter(
    (rider) => !rider.vehicleType || rider.vehicleType === vehicleType
  );

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await assignBatch({ ...payload, riderId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setRiderId('');
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size={size} disabled={isPending} />}>
        {label}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign this run</DialogTitle>
          <DialogDescription>{summary}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {warning && (
            <div className="flex flex-col gap-1 rounded-[10px] border border-warning/35 bg-warning-bg p-3">
              <span className="text-[13px] font-semibold text-warning">
                Ahead of the booked window
              </span>
              <span className="text-[12.5px] text-foreground-secondary">
                {warning}
              </span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="assign-batch-rider">Courier</Label>
            <select
              id="assign-batch-rider"
              value={riderId}
              onChange={(event) => setRiderId(event.target.value)}
              className="h-9 rounded-[9px] border border-border-strong bg-card px-3 text-[13px] font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            >
              <option value="">Pick a courier…</option>
              {eligible.map((rider) => (
                <option key={rider._id} value={rider._id}>
                  {riderLabel(rider)}
                </option>
              ))}
            </select>
            <span className="text-[12.5px] text-muted-foreground">
              {eligible.length === 0
                ? `No courier on a ${vehicleType} to assign this to.`
                : `${vehicleType} couriers only. They are told straight away, even if they are offline right now.`}
            </span>
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
            onClick={submit}
            disabled={isPending || !riderId}
          >
            {isPending ? 'Assigning…' : 'Assign the run'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function riderLabel(rider: AdminRider) {
  const name =
    [rider.firstName, rider.lastName].filter(Boolean).join(' ') || rider._id;
  const tags = [
    rider.isInHouse ? 'in-house' : 'gig',
    rider.status === 'online' ? 'online' : rider.status || 'offline',
  ];
  return `${name} — ${tags.join(', ')}`;
}
