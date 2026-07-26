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
    <Button
      type="submit"
      disabled={pending}
      variant={variant}
      size={size}
      className={className}
    >
      {pending ? (
        <>
          <Spinner />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? 'size-3.5 animate-spin'}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
