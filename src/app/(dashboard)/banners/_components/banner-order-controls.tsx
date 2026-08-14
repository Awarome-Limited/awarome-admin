'use client';

import { useTransition } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { reorderWebBanners } from '../actions';

export function BannerOrderControls({
  ids,
  index,
}: {
  ids: string[];
  index: number;
}) {
  const [isPending, startTransition] = useTransition();

  function move(delta: number) {
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;

    const next = [...ids];
    [next[index], next[target]] = [next[target], next[index]];
    startTransition(() => reorderWebBanners(next));
  }

  const buttonClass =
    'rounded-md border border-border-strong p-1 text-foreground-secondary transition-colors hover:bg-muted disabled:opacity-40';

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Move up"
        className={buttonClass}
        disabled={isPending || index === 0}
        onClick={() => move(-1)}
      >
        <ChevronUpIcon size={14} />
      </button>
      <button
        type="button"
        aria-label="Move down"
        className={buttonClass}
        disabled={isPending || index === ids.length - 1}
        onClick={() => move(1)}
      >
        <ChevronDownIcon size={14} />
      </button>
    </div>
  );
}
