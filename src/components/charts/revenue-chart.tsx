'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

export function RevenueChart({
  data,
}: {
  data: { date: string; revenue: number; orderCount: number }[];
}) {
  if (!data || data.length === 0) {
    return (
      <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No revenue data for this period.
      </p>
    );
  }

  return (
    // Wrapper sets the CSS `color` property so SVG `currentColor` resolves correctly.
    // SVG presentation attributes (fill/stroke) can't parse var(), but they DO read
    // the inherited `color` CSS property via currentColor.
    <div style={{ color: 'var(--color-primary)' }}>
      <ResponsiveContainer width="100%" height={256}>
        <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              {/* stopColor as a CSS style (not SVG attribute) inherits currentColor */}
              <stop offset="5%" style={{ stopColor: 'currentColor', stopOpacity: 0.25 }} />
              <stop offset="95%" style={{ stopColor: 'currentColor', stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            width={70}
            tickFormatter={(value) => `₦${Number(value).toLocaleString()}`}
          />
          <Tooltip
            formatter={(value) => [`₦${Number(value ?? 0).toLocaleString()}`, 'Revenue']}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="currentColor"
            strokeWidth={2}
            fill="url(#revenueFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
