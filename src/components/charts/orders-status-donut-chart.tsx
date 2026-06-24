'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const SEGMENT_COLORS = [
  'var(--primary)',
  'var(--warning)',
  'var(--destructive)',
  'var(--positive)',
  'var(--muted-foreground)',
];

export function OrdersStatusDonutChart({
  data,
}: {
  data: { status: string; count: number }[];
}) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (data.length === 0) {
    return (
      <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No orders yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative size-[140px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="status"
              innerRadius={48}
              outerRadius={64}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={entry.status} fill={SEGMENT_COLORS[index % SEGMENT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold tabular-nums">{total}</span>
          <span className="text-[11px] text-muted-foreground">orders</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {data.map((entry, index) => (
          <div key={entry.status} className="flex items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-sm"
              style={{ background: SEGMENT_COLORS[index % SEGMENT_COLORS.length] }}
            />
            <span className="flex-1 text-[12.5px] text-foreground-secondary">{entry.status}</span>
            <span className="text-[12.5px] font-semibold tabular-nums">{entry.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
