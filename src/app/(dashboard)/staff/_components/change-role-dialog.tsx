'use client';

import { useState, useTransition } from 'react';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StaffRole } from '@/lib/permissions';
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/lib/staff-roles';
import { updateStaff } from '../actions';

export function ChangeRoleDialog({
  staffId,
  staffName,
  role,
}: {
  staffId: string;
  staffName: string;
  role: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function pick(nextRole: StaffRole) {
    if (nextRole === role) {
      setOpen(false);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await updateStaff(staffId, { role: nextRole });
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update role.');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-brand-tint2 text-primary inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-opacity hover:opacity-80"
      >
        {ROLE_LABELS[role as StaffRole] ?? role}
        <ChevronDownIcon className="size-3" />
      </button>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Change role</DialogTitle>
          <DialogDescription>{staffName}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {Object.values(StaffRole).map((option) => {
            const active = option === role;
            return (
              <button
                key={option}
                type="button"
                disabled={isPending}
                onClick={() => pick(option)}
                className={`flex items-center justify-between gap-3 rounded-[11px] border px-[15px] py-[13px] text-left transition-colors hover:bg-secondary disabled:pointer-events-none disabled:opacity-50 ${
                  active ? 'border-primary bg-brand-tint' : 'border-border-strong'
                }`}
              >
                <div>
                  <div className="text-[13.5px] font-semibold text-foreground">
                    {ROLE_LABELS[option]}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {ROLE_DESCRIPTIONS[option]}
                  </div>
                </div>
                {active && <CheckIcon className="text-primary size-[18px] shrink-0" />}
              </button>
            );
          })}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
