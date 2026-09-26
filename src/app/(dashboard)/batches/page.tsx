import Link from 'next/link';
import { authedFetch, ApiError, PaginatedResponse } from '@/lib/api-client';
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
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { AdminBatchListItem } from '@/lib/types';
import { batchStatusLabel, batchStatusVariant, riderDisplayName } from './batch-format';

const LIMIT = 20;

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active', statuses: 'assigned,in-progress' },
  { key: 'offered', label: 'On offer', statuses: 'offered' },
  { key: 'unassigned', label: 'Unassigned', statuses: 'unassigned' },
  { key: 'completed', label: 'Completed', statuses: 'completed' },
  { key: 'partial', label: 'Partial', statuses: 'partial' },
  { key: 'dissolved', label: 'Dissolved', statuses: 'dissolved' },
] as const;

const VEHICLES = ['bike', 'car', 'truck'] as const;

type BatchesResponse = PaginatedResponse<AdminBatchListItem> & {
  counts: Record<string, number>;
};

function filterCount(counts: Record<string, number>, key: string) {
  const filter = FILTERS.find((f) => f.key === key);
  if (!filter || !('statuses' in filter)) return counts.all ?? 0;
  return filter.statuses.split(',').reduce((sum, s) => sum + (counts[s] ?? 0), 0);
}

export default async function BatchesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const skip = Number(params.skip ?? 0);
  const search = params.search ?? '';
  const activeFilter = params.filter ?? 'all';
  const vehicle = params.vehicle ?? '';
  const filter = FILTERS.find((f) => f.key === activeFilter);

  const query = new URLSearchParams();
  query.set('skip', String(skip));
  query.set('limit', String(LIMIT));
  if (search) query.set('search', search);
  if (vehicle) query.set('vehicleType', vehicle);
  if (params.rider) query.set('rider', params.rider);
  if (filter && 'statuses' in filter) query.set('status', filter.statuses);

  let result: BatchesResponse;
  try {
    result = await authedFetch<BatchesResponse>(`/admins/batches?${query.toString()}`);
  } catch (error) {
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Something went wrong.'}
      />
    );
  }

  const counts = result.counts ?? {};
  const chips = [
    { label: 'All batches', value: counts.all ?? 0 },
    { label: 'Out on the road', value: filterCount(counts, 'active') },
    { label: 'Waiting for a courier', value: (counts.offered ?? 0) + (counts.unassigned ?? 0) },
    { label: 'Completed', value: (counts.completed ?? 0) + (counts.partial ?? 0) },
  ];

  const hrefWith = (changes: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { search, filter: activeFilter, vehicle, rider: params.rider, ...changes };
    Object.entries(merged).forEach(([k, v]) => {
      if (v && !(k === 'filter' && v === 'all')) p.set(k, v);
    });
    const s = p.toString();
    return `/batches${s ? `?${s}` : ''}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-[23px] font-bold tracking-tight text-foreground">Batches</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Every multi-drop run dispatch has formed — who is carrying it, and how far along each
          drop is.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {chips.map((chip) => (
          <div
            key={chip.label}
            className="flex flex-col gap-1 rounded-[12px] border border-border bg-card p-[13px_16px] shadow-[var(--shadow-card)]"
          >
            <span className="text-[12px] font-medium text-muted-foreground">{chip.label}</span>
            <span className="text-[20px] font-bold tabular-nums text-foreground">
              {chip.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      {params.rider && (
        <div className="flex w-fit items-center gap-2 rounded-[9px] border border-border bg-card px-3 py-1.5 text-[13px] text-foreground-secondary">
          Showing one courier&apos;s batches
          <Link href={hrefWith({ rider: undefined })} className="font-semibold text-primary hover:underline">
            Clear
          </Link>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => {
            const active = activeFilter === f.key;
            return (
              <Link
                key={f.key}
                href={hrefWith({ filter: f.key, skip: undefined })}
                className={cn(
                  'rounded-[9px] border px-3.5 py-[7px] text-[13px] font-semibold transition-colors',
                  active
                    ? 'border-transparent bg-brand-tint text-primary'
                    : 'border-border-strong bg-card text-foreground-secondary hover:bg-muted'
                )}
              >
                {f.label}
                <span className="ml-1.5 tabular-nums opacity-70">{filterCount(counts, f.key)}</span>
              </Link>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-[9px] border border-border-strong bg-card p-0.5">
            {['', ...VEHICLES].map((v) => (
              <Link
                key={v || 'any'}
                href={hrefWith({ vehicle: v || undefined, skip: undefined })}
                className={cn(
                  'rounded-[7px] px-2.5 py-1 text-[12.5px] font-semibold capitalize',
                  vehicle === v
                    ? 'bg-brand-tint text-primary'
                    : 'text-foreground-secondary hover:bg-muted'
                )}
              >
                {v || 'Any vehicle'}
              </Link>
            ))}
          </div>
          <SearchBox placeholder="Search by batch ID…" />
        </div>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Courier</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Drops</TableHead>
                <TableHead className="text-right">Fare</TableHead>
                <TableHead>Window</TableHead>
                <TableHead>Formed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.map((batch) => {
                const { stops, delivered, failed, fare } = batch.summary;
                const rider = batch.rider;
                return (
                  <TableRow key={batch._id}>
                    <TableCell>
                      <Link
                        href={`/batches/${encodeURIComponent(batch.batchId)}`}
                        className="rounded bg-chip px-2 py-0.5 font-mono text-xs hover:underline"
                      >
                        {batch.batchId}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={batchStatusVariant(batch.status)} dot>
                        {batchStatusLabel(batch.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {rider ? (
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {riderDisplayName(rider)}
                            {rider.isInHouse && (
                              <span className="ml-1.5 rounded bg-chip px-1.5 py-0.5 text-[10.5px] font-semibold text-foreground-secondary">
                                In-house
                              </span>
                            )}
                          </span>
                          <span className="text-[12px] text-muted-foreground">{rider.phone || '—'}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          {batch.declinedCount
                            ? `None yet · ${batch.declinedCount} declined`
                            : 'None yet'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <span className="capitalize">{batch.vehicleType}</span>
                      <span className="text-[12px]"> · {batch.assignmentMode}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-positive"
                            style={{ width: `${stops ? (delivered / stops) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="tabular-nums text-[12.5px]">
                          {delivered}/{stops}
                        </span>
                        {failed > 0 && (
                          <span className="text-[12px] text-destructive">{failed} failed</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      ₦{fare.toLocaleString()}
                    </TableCell>
                    <TableCell className="capitalize text-muted-foreground">
                      {batch.window || 'Open'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(batch.createdAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
              {result.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    No batches found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="border-t border-border px-4 py-3">
          <PaginationControls
            skip={skip}
            limit={LIMIT}
            totalCount={result.totalCount}
            basePath="/batches"
            searchParams={params}
          />
        </div>
      </div>
    </div>
  );
}
