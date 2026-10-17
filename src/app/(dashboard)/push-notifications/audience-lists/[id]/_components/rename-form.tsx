'use client';

import { useTransition, useState } from 'react';
import { toast } from 'sonner';
import type { ActionResult } from '@/lib/action-result';
import { Button } from '@/components/ui/button';

export function RenameForm({
  currentName,
  action,
}: {
  currentName: string;
  action: (name: string) => Promise<ActionResult>;
}) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(currentName);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    startTransition(async () => {
      const result = await action(trimmed);
      if (result.ok) toast.success('List renamed successfully.');
      else toast.error(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[9px]">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={80}
        required
        className="field w-full"
      />
      <Button
        type="submit"
        loading={isPending}
        disabled={isPending || name.trim() === currentName || !name.trim()}
        className="self-start"
      >
        {isPending ? 'Saving…' : 'Save name'}
      </Button>
    </form>
  );
}
