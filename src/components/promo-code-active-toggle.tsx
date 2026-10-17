'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/** Whether a code can be redeemed. A word in lists, a word plus a button on the detail page. */
export function PromoStatusPill({ isActive }: { isActive: boolean }) {
  return (
    <Badge variant={isActive ? 'positive' : 'secondary'} dot={isActive}>
      {isActive ? 'Active' : 'Off'}
    </Badge>
  );
}

export function PromoCodeActiveControl({
  isActive,
  action,
}: {
  isActive: boolean;
  action: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <PromoStatusPill isActive={isActive} />
      <Button
        variant={isActive ? 'destructive' : 'outline'}
        size="sm"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            try {
              await action();
              toast.success(isActive ? 'Turned off' : 'Turned on');
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Action failed. Please try again.');
            }
          })
        }
      >
        {isPending ? 'Saving…' : isActive ? 'Turn off' : 'Turn on'}
      </Button>
    </div>
  );
}
