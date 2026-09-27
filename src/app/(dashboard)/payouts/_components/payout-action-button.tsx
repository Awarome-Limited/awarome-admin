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

type Result = { ok: true } | { ok: false; error: string };

/**
 * A payout action behind a confirmation. These move real money, so each one
 * asks first, and a refusal from the API or Paystack is shown as-is rather
 * than as a generic failure.
 */
export function PayoutActionButton({
  label,
  title,
  description,
  confirmLabel = 'Confirm',
  successMessage,
  action,
  variant = 'default',
  size = 'sm',
}: {
  label: string;
  title: string;
  description: string;
  confirmLabel?: string;
  successMessage: string;
  action: () => Promise<Result>;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive';
  size?: 'sm' | 'default';
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const run = () =>
    startTransition(async () => {
      const result = await action();
      setOpen(false);
      if (result.ok) toast.success(successMessage);
      else toast.error(result.error);
    });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant={variant} size={size} disabled={isPending} />}>
        {isPending ? 'Working…' : label}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={run}>
            {isPending ? 'Working…' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Same as above without the confirmation, for harmless actions like a status refresh. */
export function PayoutQuickAction({
  label,
  successMessage,
  action,
}: {
  label: string;
  successMessage: string;
  action: () => Promise<Result>;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await action();
          if (result.ok) toast.success(successMessage);
          else toast.error(result.error);
        })
      }
    >
      {isPending ? 'Checking…' : label}
    </Button>
  );
}
