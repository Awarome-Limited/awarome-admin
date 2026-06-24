import Link from 'next/link';
import { authedFetch, ApiError, PaginatedResponse } from '@/lib/api-client';
import { AdminDelivery } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { SearchBox } from '@/components/search-box';
import { PaginationControls } from '@/components/pagination-controls';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { formatDate, statusBadgeVariant } from '@/lib/format';
import { cn } from '@/lib/utils';

const LIMIT = 20;

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'initialized', label: 'Initialized' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'failed', label: 'Failed' },
] as const;

function filterToQuery(filter: string): Record<string, string> {
  if (filter === 'delivered') return { status: 'confirmed' };
  if (filter !== 'all') return { status: filter };
  return {};
}

function customerName(user: AdminDelivery['user']) {
  if (!user || typeof user === 'string') return user || '—';
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || '—';
}

async function safeCount(url: string): Promise<number> {
  try {
    const r = await authedFetch<PaginatedResponse<unknown>>(url);
    return r.totalCount ?? 0;
  } catch {
    return 0;
  }
}

export default async function DeliveriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const skip = Number(params.skip ?? 0);
  const search = params.search ?? '';
  const activeFilter = params.filter ?? 'all';
  const filterQ = filterToQuery(activeFilter);

  const query = new URLSearchParams();
  query.set('skip', String(skip));
  query.set('limit', String(LIMIT));
  if (search) query.set('search', search);
  Object.entries(filterQ).forEach(([k, v]) => query.set(k, v));

  let result: PaginatedResponse<AdminDelivery>;
  let totalDeliveriesCount = 0;
  let pendingCount = 0;
  let initializedCount = 0;
  let completedCount = 0;

  try {
    [result, totalDeliveriesCount, pendingCount, initializedCount, completedCount] = await Promise.all([
      authedFetch<PaginatedResponse<AdminDelivery>>(`/deliveries/admin?${query.toString()}`),
      safeCount('/deliveries/admin?limit=1'),
      safeCount('/deliveries/admin?status=pending&limit=1'),
      safeCount('/deliveries/admin?status=initialized&limit=1'),
      safeCount('/deliveries/admin?status=confirmed&limit=1'),
    ]);
  } catch (error) {
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Something went wrong.'}
      />
    );
  }

  const chips = [
    { label: 'Total deliveries', value: totalDeliveriesCount.toLocaleString() },
    { label: 'Pending', value: pendingCount.toLocaleString() },
    { label: 'Initialized', value: initializedCount.toLocaleString() },
    { label: 'Completed', value: completedCount.toLocaleString() },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-[23px] font-bold tracking-tight text-foreground">Deliveries</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">Standalone delivery requests</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {chips.map((chip) => (
          <div
            key={chip.label}
            className="flex flex-col gap-1 rounded-[12px] border border-border bg-card p-[13px_16px] shadow-[var(--shadow-card)]"
          >
            <span className="text-[12px] font-medium text-muted-foreground">{chip.label}</span>
            <span className="text-[20px] font-bold tabular-nums text-foreground">{chip.value}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => {
            const active = activeFilter === f.key;
            const href = (() => {
              const p = new URLSearchParams();
              if (search) p.set('search', search);
              if (f.key !== 'all') p.set('filter', f.key);
              const s = p.toString();
              return `/deliveries${s ? `?${s}` : ''}`;
            })();
            return (
              <Link
                key={f.key}
                href={href}
                className={cn(
                  'rounded-[9px] border px-3.5 py-[7px] text-[13px] font-semibold transition-colors',
                  active
                    ? 'border-transparent bg-brand-tint text-primary'
                    : 'border-border-strong bg-card text-foreground-secondary hover:bg-muted'
                )}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-[34px] items-center gap-1.5 rounded-[9px] border border-border-strong bg-card px-3.5 text-[13px] font-semibold text-foreground-secondary hover:bg-muted"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Export
          </button>
          <SearchBox placeholder="Search by delivery ID…" />
        </div>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Delivery ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.map((delivery) => (
                <TableRow key={delivery._id} className="cursor-pointer">
                  <TableCell>
                    <Link
                      href={`/deliveries/${delivery._id}`}
                      className="rounded bg-chip px-2 py-0.5 font-mono text-xs hover:underline"
                    >
                      {delivery.deliveryId}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">{customerName(delivery.user)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {[delivery.requestType, delivery.deliveryOption].filter(Boolean).join(' · ') || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(delivery.status)} dot>
                      {delivery.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    ₦{(delivery.deliveryFee ?? 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(delivery.createdAt).split(',')[0]}
                  </TableCell>
                </TableRow>
              ))}
              {result.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No deliveries found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="border-t border-border px-4 py-3">
          <PaginationControls
            skip={result.skip}
            limit={result.limit || LIMIT}
            totalCount={result.totalCount}
            basePath="/deliveries"
            searchParams={params}
          />
        </div>
      </div>
    </div>
  );
}
