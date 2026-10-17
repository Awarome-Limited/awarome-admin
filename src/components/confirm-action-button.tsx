'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
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

export function ConfirmActionButton({
  label,
  title,
  description,
  action,
  variant = 'destructive',
}: {
  label: string;
  title: string;
  description: string;
  action: () => Promise<void>;
  variant?: 'destructive' | 'default' | 'outline' | 'secondary' | 'ghost';
}) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function confirm() {
    // The dialog stays open with a spinner on Confirm until the action is done,
    // then closes; a failure keeps it open so it can be retried.
    startTransition(async () => {
      try {
        await action();
        setOpen(false);
      } catch (error) {
        toast.error(error instanceof Error && error.message ? error.message : 'That didn’t work. Try again.');
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !isPending && setOpen(next)}>
      <AlertDialogTrigger render={<Button variant={variant} size="sm" loading={isPending} />}>
        {label}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={variant}
            loading={isPending}
            onClick={confirm}
          >
            {isPending ? 'Working…' : 'Confirm'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
