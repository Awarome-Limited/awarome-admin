'use client';

import { useTransition, useState } from 'react';
import { toast } from 'sonner';
import type { ActionResult } from '@/lib/action-result';

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
        className="w-full rounded-[10px] border border-input bg-background px-[13px] py-[10px] text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
      />
      <button
        type="submit"
        disabled={isPending || name.trim() === currentName || !name.trim()}
        className="self-start rounded-[10px] bg-primary px-[18px] py-[9px] text-[13px] font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
      >
        {isPending ? 'Saving…' : 'Save name'}
      </button>
    </form>
  );
}
