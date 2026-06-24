'use client';

import { useTransition } from 'react';
import { Switch } from '@/components/ui/switch';

export function PromoCodeActiveToggle({
  isActive,
  action,
}: {
  isActive: boolean;
  action: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={isActive}
        disabled={isPending}
        onCheckedChange={() => {
          startTransition(() => {
            action();
          });
        }}
      />
      <span className="text-sm text-muted-foreground">
        {isActive ? 'Active' : 'Inactive'}
      </span>
    </div>
  );
}
