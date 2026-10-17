'use client';

import { useLinkStatus } from 'next/link';
import { Spinner } from '@/components/submit-button';
import { cn } from '@/lib/utils';

/**
 * A small spinner shown inside a `<Link>` while its navigation is pending.
 * It is always rendered and only fades in, positioned absolutely so the link
 * never changes size. The Link needs `relative`; pass a `className` to place
 * the spinner (defaults to the right padding).
 */
export function LinkPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute top-1/2 right-1 flex -translate-y-1/2 transition-opacity duration-150',
        pending ? 'opacity-100' : 'opacity-0',
        className
      )}
    >
      <Spinner className="size-3 animate-spin" />
    </span>
  );
}
