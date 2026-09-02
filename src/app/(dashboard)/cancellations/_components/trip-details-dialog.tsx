'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export interface TripParty {
  name: string;
  phone?: string;
  email?: string;
  role: string;
}

export interface TripDetails {
  reference: string;
  jobType: 'order' | 'delivery';
  parties: TripParty[];
  pickup: { address: string; note?: string };
  dropoff: { address: string; note?: string };
  facts: { label: string; value: string }[];
  reason: string;
  reasonNote?: string;
  stage: string;
  requestedAt?: string;
}

function Party({ party }: { party: TripParty }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-[10px] border border-border p-3">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {party.role}
      </span>
      <span className="text-[14px] font-semibold text-foreground">
        {party.name || '—'}
      </span>
      {/* Phone first: ops rings these before they decide anything. */}
      {party.phone && (
        <a
          href={`tel:${party.phone}`}
          className="text-[13px] text-primary hover:underline"
        >
          {party.phone}
        </a>
      )}
      {party.email && (
        <span className="text-[12.5px] text-muted-foreground">{party.email}</span>
      )}
      {!party.phone && !party.email && (
        <span className="text-[12.5px] text-muted-foreground">No contact on file</span>
      )}
    </div>
  );
}

/**
 * Everything about the trip behind one request, in one place.
 *
 * The queue table can only carry so much, and deciding this case means ringing
 * a sender, a receiver and a rider — so their numbers, both addresses and what
 * the run was worth all live here rather than three pages away.
 */
export function TripDetailsDialog({ details }: { details: TripDetails }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        Details
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{details.reference}</DialogTitle>
          <DialogDescription>
            {details.stage}
            {details.requestedAt ? ` · raised ${details.requestedAt}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="rounded-[10px] border border-destructive/30 bg-destructive/5 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-destructive">
              Rider&apos;s reason
            </div>
            <div className="mt-1 text-[14px] font-semibold text-foreground">
              {details.reason}
            </div>
            {details.reasonNote && (
              <div className="mt-1 text-[13px] text-muted-foreground">
                “{details.reasonNote}”
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {details.parties.map((party) => (
              <Party key={party.role} party={party} />
            ))}
          </div>

          <div className="flex flex-col gap-3 rounded-[10px] border border-border p-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Pickup
              </div>
              <div className="mt-0.5 text-[13.5px] text-foreground">
                {details.pickup.address || '—'}
              </div>
              {details.pickup.note && (
                <div className="text-[12.5px] text-muted-foreground">
                  Note: {details.pickup.note}
                </div>
              )}
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Drop-off
              </div>
              <div className="mt-0.5 text-[13.5px] text-foreground">
                {details.dropoff.address || '—'}
              </div>
              {details.dropoff.note && (
                <div className="text-[12.5px] text-muted-foreground">
                  Note: {details.dropoff.note}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {details.facts.map((fact) => (
              <div key={fact.label} className="flex flex-col gap-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {fact.label}
                </span>
                <span className="text-[13.5px] font-semibold tabular-nums text-foreground">
                  {fact.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
