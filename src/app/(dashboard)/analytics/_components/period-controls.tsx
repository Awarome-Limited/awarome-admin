'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { AnalyticsPeriodType } from '@/lib/types';
import { cn } from '@/lib/utils';

const PERIODS: { type: AnalyticsPeriodType; label: string }[] = [
  { type: 'day', label: 'Daily' },
  { type: 'week', label: 'Weekly' },
  { type: 'month', label: 'Monthly' },
];

const href = (type: AnalyticsPeriodType, date?: string) =>
  `/analytics?period=${type}${date ? `&date=${date}` : ''}`;

/** Today's date in Lagos, as the backend reads it. */
const lagosToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(new Date());

const navButton =
  'flex size-8 items-center justify-center rounded-[9px] border border-border-strong bg-card text-foreground-secondary transition-colors hover:bg-muted';

export function PeriodControls({
  type,
  anchor,
  label,
  prevAnchor,
  nextAnchor,
}: {
  type: AnalyticsPeriodType;
  anchor: string;
  label: string;
  prevAnchor: string;
  nextAnchor: string | null;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="inline-flex gap-0.5 rounded-[10px] border border-border-strong bg-secondary p-[3px]">
        {PERIODS.map((p) => (
          <Link
            key={p.type}
            // Keeps the date, so a day opens into the week or month around it.
            href={href(p.type, anchor)}
            className={cn(
              'rounded-[8px] px-[11px] py-1.5 text-[12.5px] font-semibold transition-colors',
              p.type === type
                ? 'bg-card text-foreground shadow-[var(--shadow-card)]'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {p.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <Link href={href(type, prevAnchor)} className={navButton} aria-label="Previous period">
          <ChevronLeft className="size-4" />
        </Link>
        <span className="min-w-[150px] text-center text-[13.5px] font-semibold text-foreground">
          {label}
        </span>
        {nextAnchor ? (
          <Link href={href(type, nextAnchor)} className={navButton} aria-label="Next period">
            <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span className={cn(navButton, 'pointer-events-none opacity-40')} aria-hidden>
            <ChevronRight className="size-4" />
          </span>
        )}
      </div>

      {nextAnchor && (
        <Link
          href={href(type)}
          className="rounded-[9px] border border-border-strong bg-card px-3 py-[6px] text-[12.5px] font-semibold text-foreground-secondary transition-colors hover:bg-muted"
        >
          Current
        </Link>
      )}

      <input
        type="date"
        aria-label="Jump to date"
        value={anchor}
        max={lagosToday()}
        onChange={(event) => {
          if (event.target.value) router.push(href(type, event.target.value));
        }}
        className="h-8 rounded-[9px] border border-border-strong bg-card px-2.5 text-[12.5px] text-foreground-secondary"
      />
    </div>
  );
}
