export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-4">
      {/* Page header */}
      <div>
        <div className="h-7 w-36 animate-pulse rounded-md bg-muted" />
        <div className="mt-2 h-4 w-56 animate-pulse rounded-md bg-muted" />
      </div>

      {/* Stat chips */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-[12px] border border-border bg-card p-[13px_16px] shadow-[var(--shadow-card)]"
          >
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            <div className="h-6 w-14 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 w-20 animate-pulse rounded-[9px] bg-muted" />
          ))}
        </div>
        <div className="h-8 w-52 animate-pulse rounded-[10px] bg-muted" />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-4 border-b border-border px-4 py-3">
          {[30, 20, 16, 16, 18].map((w, i) => (
            <div key={i} className="h-3.5 animate-pulse rounded bg-muted" style={{ width: `${w}%` }} />
          ))}
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-3.5 last:border-0">
            {[30, 20, 16, 16, 18].map((w, j) => (
              <div key={j} className="h-3.5 animate-pulse rounded bg-muted" style={{ width: `${w}%` }} />
            ))}
          </div>
        ))}
        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-36 animate-pulse rounded bg-muted" />
            <div className="flex gap-2">
              <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
              <div className="h-8 w-16 animate-pulse rounded-md bg-muted" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
