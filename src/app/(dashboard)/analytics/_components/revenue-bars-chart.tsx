'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  type TooltipContentProps,
  type TooltipValueType,
} from 'recharts';
import type { AnalyticsTrendPoint } from '@/lib/types';

// Validated as a pair (light and dark) for colour-blind separation.
const SERIES = [
  { key: 'orderRevenue', count: 'orders', label: 'Orders', color: 'var(--chart-1)' },
  { key: 'deliveryRevenue', count: 'deliveries', label: 'Deliveries', color: 'var(--chart-4)' },
] as const;

const naira = (value: number) => `₦${Math.round(value).toLocaleString()}`;

function compactNaira(value: number) {
  if (value >= 1_000_000) return `₦${+(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `₦${+(value / 1_000).toFixed(1)}k`;
  return `₦${value}`;
}

export function RevenueBarsLegend() {
  return (
    <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
      {SERIES.map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1.5">
          <span className="size-[9px] rounded-[3px]" style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

function RevenueTooltip({ active, payload, label }: TooltipContentProps<TooltipValueType, string | number>) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as AnalyticsTrendPoint;

  return (
    <div className="min-w-[180px] rounded-[10px] border border-border bg-popover px-3 py-2.5 text-[12px] shadow-[var(--shadow-card)]">
      <div className="mb-1.5 font-semibold text-foreground">{label}</div>
      {SERIES.map((s) => (
        <div key={s.key} className="flex items-center justify-between gap-4 py-0.5">
          <span className="inline-flex items-center gap-1.5 text-foreground-secondary">
            <span className="size-[8px] rounded-[2px]" style={{ background: s.color }} />
            {s.label} · {point[s.count]}
          </span>
          <span className="tabular-nums text-foreground">{naira(point[s.key])}</span>
        </div>
      ))}
      <div className="mt-1 flex items-center justify-between gap-4 border-t border-border pt-1.5 font-semibold">
        <span className="text-foreground-secondary">Total · {point.jobs}</span>
        <span className="tabular-nums text-foreground">{naira(point.revenue)}</span>
      </div>
    </div>
  );
}

export function RevenueBarsChart({
  data,
  height = 240,
  emptyMessage = 'No paid activity in this period.',
}: {
  data: AnalyticsTrendPoint[];
  height?: number;
  emptyMessage?: string;
}) {
  if (!data.some((point) => point.jobs > 0)) {
    return (
      <p
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        {emptyMessage}
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="18%">
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
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
          width={56}
          tickFormatter={(value) => compactNaira(Number(value))}
        />
        <Tooltip content={RevenueTooltip} cursor={{ fill: 'var(--chip)' }} />
        {SERIES.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stackId="revenue"
            fill={s.color}
            // A thin surface-coloured edge keeps the two stacked segments apart.
            stroke="var(--card)"
            strokeWidth={1}
            radius={i === SERIES.length - 1 ? [4, 4, 0, 0] : 0}
            maxBarSize={36}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
