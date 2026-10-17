/** Loading state shaped like a list page: header, stat strip, table card. */
export function ListSkeleton({ stats = 4, columns = [30, 20, 16, 16, 18] }: { stats?: number; columns?: number[] }) {
  return (
    <div className="flex flex-col gap-7" aria-busy>
      <div>
        <div className="h-9 w-48 animate-pulse rounded-[8px] bg-muted" />
        <div className="mt-3 h-4 w-72 animate-pulse rounded bg-muted" />
      </div>

      {stats > 0 && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] overflow-hidden rounded-[10px] border border-border bg-card">
          {Array.from({ length: stats }).map((_, i) => (
            <div key={i} className="-ml-px flex flex-col gap-2.5 border-l border-border px-[22px] py-[18px]">
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              <div className="h-7 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-[10px] border border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
          <div className="h-10 w-72 animate-pulse rounded-full bg-muted" />
          <div className="ml-auto h-[38px] w-60 animate-pulse rounded-full bg-muted" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex h-[64px] items-center gap-4 border-b border-border px-6 last:border-0">
            {columns.map((w, j) => (
              <div key={j} className="h-3.5 animate-pulse rounded bg-muted" style={{ width: `${w}%` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
