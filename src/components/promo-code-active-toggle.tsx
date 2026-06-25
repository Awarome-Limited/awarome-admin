'use client';

import { useState, useTransition } from 'react';
import { Switch } from '@/components/ui/switch';

export function PromoCodeActiveToggle({
  isActive,
  action,
}: {
  isActive: boolean;
  action: () => Promise<{ error?: string }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [localActive, setLocalActive] = useState(isActive);
  const [error, setError] = useState<string | null>(null);

  function handleChange(checked: boolean) {
    setLocalActive(checked);
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) {
        setLocalActive(!checked);
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Switch
          checked={localActive}
          disabled={isPending}
          onCheckedChange={handleChange}
        />
        <span className="text-sm text-muted-foreground">
          {isPending ? 'Saving…' : localActive ? 'Active' : 'Inactive'}
        </span>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
