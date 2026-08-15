'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

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
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Something went wrong</CardTitle>
        <CardDescription>
          {error.message || 'This section failed to load.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error.digest && (
          <p className="font-mono text-[11px] text-muted-foreground">
            Reference: {error.digest}
          </p>
        )}
        <Button type="button" onClick={reset} className="self-start">
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}
