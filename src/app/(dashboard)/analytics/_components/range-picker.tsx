'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  RANGE_PRESETS,
  type DateRange,
  type RangePresetKey,
  lagosToday,
} from '../_lib/ranges';

const control =
  'h-[34px] rounded-[9px] border border-border-strong bg-card px-3 text-[13px] text-foreground-secondary outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50';

export function RangePicker({ preset, range }: { preset: RangePresetKey; range: DateRange }) {
  const router = useRouter();
  const [selected, setSelected] = useState<RangePresetKey>(preset);
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  const today = lagosToday();

  function choose(next: RangePresetKey) {
    setSelected(next);
    // Custom waits for both dates and Apply; every other preset applies at once.
    if (next !== 'custom') router.push(`/analytics?range=${next}`);
  }

  const canApply = from && to && from <= to && to <= today;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Date range"
        value={selected}
        onChange={(e) => choose(e.target.value as RangePresetKey)}
        className={`${control} font-semibold`}
      >
        {RANGE_PRESETS.map((p) => (
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
            if (canApply) router.push(`/analytics?range=custom&from=${from}&to=${to}`);
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
            className="h-[34px] rounded-[9px] bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Apply
          </button>
        </form>
      )}
    </div>
  );
}
