'use client';

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  type TooltipContentProps,
  type TooltipValueType,
} from 'recharts';
import { useState } from 'react';
import type { AnalyticsTrendPoint } from '@/lib/types';
import { segmentItem, segmentTrack } from '@/components/segmented';

type Metric = 'revenue' | 'jobs';

// Series 1 is brand indigo, series 2 the orange accent (DESIGN.md "Charts").
// The comparison line is neutral dashed ink, not a third hue.
const SERIES: Record<
  Metric,
  { key: keyof AnalyticsTrendPoint; label: string; color: string }[]
> = {
  revenue: [
    { key: 'orderRevenue', label: 'Orders', color: 'var(--chart-1)' },
    { key: 'deliveryRevenue', label: 'Deliveries', color: 'var(--chart-2)' },
  ],
  jobs: [
    { key: 'orders', label: 'Orders', color: 'var(--chart-1)' },
    { key: 'deliveries', label: 'Deliveries', color: 'var(--chart-2)' },
  ],
};

const TOTAL: Record<Metric, keyof AnalyticsTrendPoint> = {
  revenue: 'revenue',
  jobs: 'jobs',
};

const PREVIOUS: Record<Metric, keyof AnalyticsTrendPoint> = {
  revenue: 'previousRevenue',
  jobs: 'previousJobs',
};

const PREVIOUS_COLOR = 'var(--muted-foreground)';

const naira = (value: number) => `₦ ${Math.round(value).toLocaleString()}`;

function compactNaira(value: number) {
  if (value >= 1_000_000) return `₦ ${+(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `₦ ${+(value / 1_000).toFixed(1)}k`;
  return `₦ ${value}`;
}

export function TrendLegend({ metric, previousLabel }: { metric: Metric; previousLabel?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-[12.5px] text-foreground-secondary">
      {SERIES[metric].map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1.5">
          <span className="size-[9px] rounded-[3px]" style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <svg width="14" height="4" aria-hidden>
          <line x1="0" y1="2" x2="14" y2="2" stroke={PREVIOUS_COLOR} strokeWidth="2" strokeDasharray="3 2" />
        </svg>
        {previousLabel ?? 'Previous range'}
      </span>
    </div>
  );
}

const METRICS: { key: Metric; label: string }[] = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'jobs', label: 'Paid jobs' },
];

/** One chart card with a metric switch, rather than a card per metric. */
export function TrendCard({
  data,
  previousLabel,
}: {
  data: AnalyticsTrendPoint[];
  previousLabel: string;
}) {
  const [metric, setMetric] = useState<Metric>('revenue');
  return (
    <div className="flex min-w-0 flex-col gap-[18px] rounded-[10px] border border-border bg-card px-6 py-[22px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className={segmentTrack}>
          {METRICS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMetric(m.key)}
              className={segmentItem(metric === m.key, 'sm')}
            >
              {m.label}
            </button>
          ))}
        </div>
        <TrendLegend metric={metric} previousLabel={previousLabel} />
      </div>
      <TrendChart data={data} metric={metric} height={260} />
    </div>
  );
}

export function TrendChart({
  data,
  metric,
  height = 240,
}: {
  data: AnalyticsTrendPoint[];
  metric: Metric;
  height?: number;
}) {
  if (!data.some((point) => point.jobs > 0 || point.previousJobs > 0)) {
    return (
      <p
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        No paid activity in this range or the one before.
      </p>
    );
  }

  const format = (value: number) =>
    metric === 'revenue' ? naira(value) : Math.round(value).toLocaleString();

  function TrendTooltip({ active, payload, label }: TooltipContentProps<TooltipValueType, string | number>) {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload as AnalyticsTrendPoint;

    return (
      <div className="min-w-[180px] rounded-[8px] border border-border bg-popover px-3 py-2.5 text-[12px] shadow-[0_8px_24px_rgba(18,4,96,0.12)]">
        <div className="mb-1.5 font-semibold text-foreground">{label}</div>
        {SERIES[metric].map((s) => (
          <div key={s.key} className="flex items-center justify-between gap-4 py-0.5">
            <span className="inline-flex items-center gap-1.5 text-foreground-secondary">
              <span className="size-[8px] rounded-[2px]" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="tabular-nums text-foreground">{format(point[s.key] as number)}</span>
          </div>
        ))}
        <div className="mt-1 flex items-center justify-between gap-4 border-t border-border pt-1.5 font-semibold">
          <span className="text-foreground-secondary">Total</span>
          <span className="tabular-nums text-foreground">
            {format(point[TOTAL[metric]] as number)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-0.5 text-muted-foreground">
          <span>Previous range</span>
          <span className="tabular-nums">{format(point[PREVIOUS[metric]] as number)}</span>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="18%">
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          tickLine={false}
          axisLine={{ stroke: 'var(--border)' }}
          interval="preserveStartEnd"
          minTickGap={8}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          tickLine={false}
          axisLine={false}
          width={metric === 'revenue' ? 56 : 36}
          allowDecimals={false}
          tickFormatter={(value) =>
            metric === 'revenue' ? compactNaira(Number(value)) : String(value)
          }
        />
        <Tooltip content={TrendTooltip} cursor={{ fill: 'var(--chip)' }} />
        {SERIES[metric].map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stackId={metric}
            fill={s.color}
            // A thin surface-coloured edge keeps the two stacked segments apart.
            stroke="var(--card)"
            strokeWidth={1}
            radius={i === SERIES[metric].length - 1 ? [4, 4, 0, 0] : 0}
            maxBarSize={36}
          />
        ))}
        <Line
          dataKey={PREVIOUS[metric]}
          name="Previous range"
          type="monotone"
          stroke={PREVIOUS_COLOR}
          strokeWidth={2}
          strokeDasharray="4 3"
          dot={false}
          activeDot={{ r: 4, fill: PREVIOUS_COLOR, stroke: 'var(--card)', strokeWidth: 2 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
