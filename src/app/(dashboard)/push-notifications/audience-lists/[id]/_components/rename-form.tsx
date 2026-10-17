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
        className="field w-full"
      />
      <button
        type="submit"
        disabled={isPending || name.trim() === currentName || !name.trim()}
        className="self-start rounded-full bg-primary px-[18px] py-[9px] text-[13px] font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
      >
        {isPending ? 'Saving…' : 'Save name'}
      </button>
    </form>
  );
}
