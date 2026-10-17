'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { segmentItem, segmentTrack } from '@/components/segmented';
import { cn } from '@/lib/utils';
import {
  RANGE_PRESETS,
  type DateRange,
  type RangePresetKey,
  lagosToday,
} from './ranges';
import { startNavigationProgress } from '@/components/navigation-progress';

/** The four ranges people reach for; everything else lives in the "More" menu. */
const QUICK: RangePresetKey[] = ['today', 'last7', 'last30', 'thisMonth'];

const control =
  'h-[38px] rounded-full border border-border bg-card px-3.5 text-[13.5px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50';

export function RangePicker({ preset, range }: { preset: RangePresetKey; range: DateRange }) {
  const router = useRouter();
  const [selected, setSelected] = useState<RangePresetKey>(preset);
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  const today = lagosToday();

  function choose(next: RangePresetKey) {
    setSelected(next);
    // Custom waits for both dates and Apply; every other preset applies at once.
    if (next !== 'custom') {
      startNavigationProgress();
      router.push(`/?range=${next}`);
    }
  }

  const canApply = from && to && from <= to && to <= today;
  const inMore = !QUICK.includes(selected);

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className={segmentTrack}>
        {QUICK.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => choose(key)}
            className={segmentItem(selected === key)}
          >
            {RANGE_PRESETS.find((p) => p.key === key)?.label}
          </button>
        ))}
      </div>
      <select
        aria-label="More date ranges"
        value={inMore ? selected : ''}
        onChange={(e) => choose(e.target.value as RangePresetKey)}
        className={cn(control, inMore && 'border-primary font-medium')}
      >
        <option value="" disabled>
          More…
        </option>
        {RANGE_PRESETS.filter((p) => !QUICK.includes(p.key)).map((p) => (
          <option key={p.key} value={p.key}>
            {p.label}
          </option>
        ))}
      </select>

      {selected === 'custom' && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (canApply) {
              startNavigationProgress();
              router.push(`/?range=custom&from=${from}&to=${to}`);
            }
          }}
        >
          <input
            type="date"
            aria-label="Start date"
            value={from}
            max={to || today}
            onChange={(e) => setFrom(e.target.value)}
            className={control}
          />
          <span className="text-[13px] text-muted-foreground">to</span>
          <input
            type="date"
            aria-label="End date"
            value={to}
            min={from || undefined}
            max={today}
            onChange={(e) => setTo(e.target.value)}
            className={control}
          />
          <button
            type="submit"
            disabled={!canApply}
            className="h-[38px] rounded-full bg-primary px-4 text-[13.5px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Apply
          </button>
        </form>
      )}
    </div>
  );
}
