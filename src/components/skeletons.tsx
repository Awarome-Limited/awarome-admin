import { cn } from '@/lib/utils';

/**
 * Route-level loading states. Each mirrors the layout of a page pattern
 * (DESIGN.md §5) so the page settles into place instead of jumping when the
 * data arrives. Used by the `loading.tsx` files; rendered instantly on
 * navigation while the page's data loads on the server.
 */

export function Bone({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-[6px] bg-muted', className)} />;
}

function Busy({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div role="status" aria-busy aria-live="polite" className={cn('flex flex-col gap-7', className)}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

function HeaderBones({ back = false, action = false }: { back?: boolean; action?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      {back && <Bone className="h-4 w-28" />}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-3">
          <Bone className="h-9 w-56 rounded-[8px]" />
          <Bone className="h-4 w-80 max-w-[70vw]" />
        </div>
        {action && <Bone className="h-10 w-36 rounded-full" />}
      </div>
    </div>
  );
}

function StripBones({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] overflow-hidden rounded-[10px] border border-border bg-card">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="-ml-px flex flex-col gap-2.5 border-l border-border px-[22px] py-[18px]">
          <Bone className="h-3 w-24" />
          <Bone className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

function TableBones({ rows = 8, columns = [32, 18, 14, 14, 12], toolbar = true }: { rows?: number; columns?: number[]; toolbar?: boolean }) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-border bg-card">
      {toolbar && (
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3.5">
          <Bone className="h-10 w-72 max-w-full rounded-full" />
          <Bone className="ml-auto h-[38px] w-60 max-w-full rounded-full" />
        </div>
      )}
      <div className="flex h-11 items-center gap-4 border-b border-border px-6">
        {columns.map((w, i) => (
          <div key={i} style={{ width: `${w}%` }}>
            <Bone className="h-2.5 w-1/2" />
          </div>
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex h-16 items-center gap-4 border-b border-border px-6 last:border-0">
          <div className="flex items-center gap-3" style={{ width: `${columns[0]}%` }}>
            <Bone className="size-[38px] shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Bone className="h-3.5 w-3/4" />
              <Bone className="h-3 w-1/2" />
            </div>
          </div>
          {columns.slice(1).map((w, j) => (
            <div key={j} style={{ width: `${w}%` }}>
              <Bone className="h-3.5 w-4/5" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function PanelBones({ lines = 4, fields = false, className }: { lines?: number; fields?: boolean; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-[18px] rounded-[10px] border border-border bg-card px-6 py-[22px]', className)}>
      <div className="flex flex-col gap-2">
        <Bone className="h-5 w-40" />
        <Bone className="h-3.5 w-64 max-w-full" />
      </div>
      {fields ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-x-4 gap-y-[18px]">
          {Array.from({ length: lines }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Bone className="h-3.5 w-28" />
              <Bone className="h-11 w-full rounded-[8px]" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {Array.from({ length: lines }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Bone className="h-3 w-20" />
              <Bone className="h-4 w-3/5" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Header, stat strip, table card with toolbar. */
export function ListSkeleton({ stats = 4, action = false }: { stats?: number; action?: boolean }) {
  return (
    <Busy label="Loading list">
      <HeaderBones action={action} />
      {stats > 0 && <StripBones count={stats} />}
      <TableBones />
    </Busy>
  );
}

/** Back link, identity row, stat cards, facts column + activity column. */
export function DetailSkeleton({ avatar = true }: { avatar?: boolean }) {
  return (
    <Busy label="Loading details">
      <div className="flex flex-col gap-5">
        <Bone className="h-4 w-28" />
        <div className="flex flex-wrap items-center gap-5">
          {avatar && <Bone className="size-[72px] rounded-full" />}
          <div className="flex flex-col gap-3">
            <Bone className="h-9 w-64 max-w-[60vw] rounded-[8px]" />
            <div className="flex gap-2">
              <Bone className="h-6 w-20 rounded-full" />
              <Bone className="h-6 w-40" />
            </div>
          </div>
          <Bone className="h-8 w-28 rounded-full sm:ml-auto" />
        </div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2.5 rounded-[10px] border border-border bg-card px-5 py-[18px]">
            <Bone className="h-3 w-24" />
            <Bone className="h-7 w-20" />
          </div>
        ))}
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)]">
        <PanelBones lines={5} />
        <TableBones rows={5} columns={[34, 22, 22, 18]} toolbar={false} />
      </div>
    </Busy>
  );
}

/** Concern cards on the left, sticky consequence panel on the right. */
export function SettingsSkeleton({ aside = true, cards = 3 }: { aside?: boolean; cards?: number }) {
  return (
    <Busy label="Loading settings">
      <HeaderBones />
      <div className={cn('grid items-start gap-5', aside && 'lg:grid-cols-[minmax(0,1fr)_320px]')}>
        <div className="flex flex-col gap-4">
          {Array.from({ length: cards }).map((_, i) => (
            <PanelBones key={i} fields lines={i === 0 ? 4 : 2} />
          ))}
        </div>
        {aside && <PanelBones lines={3} />}
      </div>
    </Busy>
  );
}

/** Compose card with a preview column, and a table below. */
export function ComposeSkeleton() {
  return (
    <Busy label="Loading">
      <HeaderBones action />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
        <PanelBones fields lines={4} />
        <Bone className="h-[300px] rounded-[24px]" />
      </div>
      <TableBones rows={4} toolbar={false} />
    </Busy>
  );
}

/** Greeting, needs-you-now tiles, KPI cards, strip, chart. */
export function DashboardSkeleton() {
  return (
    <Busy label="Loading dashboard">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-3">
          <Bone className="h-9 w-72 max-w-[70vw] rounded-[8px]" />
          <Bone className="h-4 w-96 max-w-[70vw]" />
        </div>
        <Bone className="h-10 w-80 max-w-full rounded-full" />
      </div>
      <div className="flex flex-col gap-4 rounded-[10px] border border-border bg-card px-[22px] py-5">
        <Bone className="h-5 w-40" />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Bone key={i} className="h-[104px] rounded-[8px]" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-[10px] border border-border bg-card px-[22px] py-5">
            <Bone className="h-3.5 w-24" />
            <Bone className="h-8 w-32" />
            <Bone className="h-3 w-40" />
          </div>
        ))}
      </div>
      <StripBones />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <Bone className="h-[340px] rounded-[10px]" />
        <PanelBones lines={4} />
      </div>
    </Busy>
  );
}

/** A small inline block for client-loaded sections. */
export function SectionSkeleton({ className }: { className?: string }) {
  return (
    <div role="status" aria-busy className={cn('flex flex-col gap-3 p-6', className)}>
      <span className="sr-only">Loading</span>
      <Bone className="h-4 w-1/3" />
      <Bone className="h-4 w-2/3" />
      <Bone className="h-4 w-1/2" />
    </div>
  );
}
