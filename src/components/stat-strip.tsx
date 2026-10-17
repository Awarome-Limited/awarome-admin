import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface Stat {
  label: string;
  value: ReactNode;
  /** A muted line under (or beside) the value: "of ₦3,000 limit", "Oldest 2 days". */
  meta?: ReactNode;
}

/**
 * Up to four numbers in one hairline-divided card (DESIGN.md "Stat strip"),
 * instead of a card per number. Prefer actionable numbers.
 */
export function StatStrip({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <section
      className={cn(
        'grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] overflow-hidden rounded-[10px] border border-border bg-card',
        className
      )}
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="-ml-px flex min-w-0 flex-col gap-1.5 border-l border-border px-[22px] py-[18px]"
        >
          <span className="text-[13px] text-muted-foreground">{stat.label}</span>
          <span className="stat-value truncate text-[28px] leading-none">{stat.value}</span>
          {stat.meta && <span className="text-[12.5px] text-muted-foreground">{stat.meta}</span>}
        </div>
      ))}
    </section>
  );
}
