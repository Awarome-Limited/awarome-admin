export default function AnalyticsLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="h-7 w-32 animate-pulse rounded-md bg-muted" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded-md bg-muted" />
      </div>

      <div className="flex flex-wrap gap-2.5">
        <div className="h-9 w-56 animate-pulse rounded-[10px] bg-muted" />
        <div className="h-9 w-60 animate-pulse rounded-[10px] bg-muted" />
      </div>

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-[14px] border border-border bg-card p-[15px_17px_14px] shadow-[var(--shadow-card)]"
          >
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            <div className="h-7 w-28 animate-pulse rounded bg-muted" />
            <div className="h-3 w-32 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]"
          >
            <div className="mb-4 h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-[240px] animate-pulse rounded-[10px] bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
