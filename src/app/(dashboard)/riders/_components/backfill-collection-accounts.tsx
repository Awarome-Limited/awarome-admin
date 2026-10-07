'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { backfillRiderCollectionAccounts } from '../actions';

/** One-off: request pay-in accounts for every approved rider who lacks one. */
export function BackfillCollectionAccounts() {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await backfillRiderCollectionAccounts();
          if (result.ok) toast.success(result.message);
          else toast.error(result.error);
        })
      }
    >
      {isPending ? 'Requesting…' : 'Set up wallet accounts'}
    </Button>
  );
}
