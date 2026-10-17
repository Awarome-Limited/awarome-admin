'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';

/**
 * Submit button for `<form action={serverAction}>`. Reads the parent form's
 * pending state via `useFormStatus`, so it must be rendered *inside* the form
 * (that hook only reports on an ancestor form). Disables itself and swaps in a
 * spinner while the action runs, so a save never looks like a no-op.
 */
export function SubmitButton({
  children = 'Save changes',
  pendingLabel = 'Saving…',
  variant,
  size,
  className,
}: {
  children?: React.ReactNode;
  pendingLabel?: string;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" loading={pending} variant={variant} size={size} className={className}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

export { Spinner } from '@/components/ui/spinner';
