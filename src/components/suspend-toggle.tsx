'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

export function SuspendToggle({
  suspended,
  action,
}: {
  suspended: boolean;
  action: (suspended: boolean) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={!suspended}
        disabled={isPending}
        onCheckedChange={(checked: boolean) => {
          startTransition(async () => {
            try {
              await action(!checked);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Action failed. Please try again.');
            }
          });
        }}
      />
      <span className="text-sm text-muted-foreground">
        {isPending ? '…' : suspended ? 'Suspended' : 'Active'}
      </span>
    </div>
  );
}
