'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Keeps a thrown Server Action or render error inside the dashboard shell.
 * Without a boundary here Next replaces the entire document with its built-in
 * "This page couldn't load" 500, which loses the nav and gives no clue what
 * failed — that is what a failing save used to look like.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error boundary caught:', error);
  }, [error]);

  return (
    <section className="flex flex-col items-center gap-3 rounded-[10px] border border-border bg-card px-6 py-14 text-center">
      <AlertTriangle className="size-5 text-warning" />
      <span className="font-heading text-[19px] font-bold tracking-[-0.03em]">Something went wrong</span>
      <span className="max-w-[52ch] text-[14px] text-foreground-secondary">
        {error.message || 'This section failed to load.'}
      </span>
      {error.digest && (
        <span className="text-[12px] text-muted-foreground tabular-nums">Reference {error.digest}</span>
      )}
      <Button type="button" onClick={reset} className="mt-2">
        Try again
      </Button>
    </section>
  );
}
