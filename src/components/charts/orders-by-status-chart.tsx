'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

export function OrdersByStatusChart({
  data,
}: {
  data: { status: string; count: number }[];
}) {
  if (!data || data.length === 0) {
    return (
      <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No orders yet.
      </p>
    );
  }

  return (
    // Wrapper sets CSS `color` so SVG currentColor resolves to the primary theme color.
    <div style={{ color: 'var(--color-primary)' }}>
      <ResponsiveContainer width="100%" height={256}>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="status" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} width={40} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill="currentColor" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
