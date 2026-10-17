'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

/** Status is a word, not a switch (DESIGN.md §1.3). */
export function StatusPill({ suspended }: { suspended: boolean }) {
  return (
    <Badge variant={suspended ? 'destructive' : 'positive'} dot>
      {suspended ? 'Suspended' : 'Active'}
    </Badge>
  );
}

/**
 * Detail-page account state: the pill, plus Suspend / Reactivate behind a
 * confirmation. Lists show only the pill; changing state happens here.
 */
export function AccountStatusControl({
  suspended,
  action,
  noun = 'account',
}: {
  suspended: boolean;
  action: (suspended: boolean) => Promise<void>;
  /** What is being suspended, for the confirmation copy: "rider", "vendor"… */
  noun?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function run() {
    setOpen(false);
    startTransition(async () => {
      try {
        await action(!suspended);
        toast.success(suspended ? 'Reactivated' : 'Suspended');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Action failed. Please try again.');
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <StatusPill suspended={suspended} />
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger
          render={
            <Button loading={isPending} variant={suspended ? 'outline' : 'destructive'} size="sm" disabled={isPending} />
          }
        >
          {isPending ? 'Saving…' : suspended ? 'Reactivate' : 'Suspend'}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {suspended ? `Reactivate this ${noun}?` : `Suspend this ${noun}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {suspended
                ? 'They can sign in and use Awarome again straight away.'
                : 'They are signed out and cannot use Awarome until someone reactivates them.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={suspended ? 'default' : 'destructive'}
              className={suspended ? undefined : 'border-transparent bg-destructive text-white hover:bg-destructive/90'}
              onClick={run}
            >
              {suspended ? 'Reactivate' : 'Suspend'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
