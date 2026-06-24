'use client';

import { useTransition } from 'react';
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
          startTransition(() => {
            action(!checked);
          });
        }}
      />
      <span className="text-sm text-muted-foreground">
        {suspended ? 'Suspended' : 'Active'}
      </span>
    </div>
  );
}
