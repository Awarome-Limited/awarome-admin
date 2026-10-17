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
import { formatDate, formatPhone, humanize } from '@/lib/format';
import { SegmentedLinks } from '@/components/segmented';
import {
  EmptyRow,
  InlineNotice,
  ListCard,
  PageHeader,
  PageStack,
  RowChevron,
  RowLink,
  ToolbarEnd,
} from '@/components/page';
import type { AdminBatchListItem } from '@/lib/types';
import { batchStatusLabel, batchStatusVariant, riderDisplayName } from './batch-format';
import { StatStrip } from '@/components/stat-strip';

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
    <PageStack>
      <PageHeader
        title="Batches"
        subtitle="Every multi-drop run dispatch has formed: who is carrying it, and how far along each drop is."
      />

      <StatStrip stats={chips.map((chip) => ({ label: chip.label, value: chip.value.toLocaleString() }))} />

      {params.rider && (
        <InlineNotice tone="info" action={<Link href={hrefWith({ rider: undefined })}>Show all couriers</Link>}>
          Showing one courier’s batches.
        </InlineNotice>
      )}

      <ListCard
        toolbar={
          <>
            <SegmentedLinks
              active={activeFilter}
              items={FILTERS.map((f) => ({
                key: f.key,
                label: f.label,
                href: hrefWith({ filter: f.key, skip: undefined }),
                count: filterCount(counts, f.key),
              }))}
            />
            <SegmentedLinks
              active={vehicle || 'any'}
              items={['', ...VEHICLES].map((v) => ({
                key: v || 'any',
                label: v ? humanize(v) : 'Any vehicle',
                href: hrefWith({ vehicle: v || undefined, skip: undefined }),
              }))}
            />
            <ToolbarEnd>
              <SearchBox placeholder="Batch ID" />
            </ToolbarEnd>
          </>
        }
        footer={
          <PaginationControls
            skip={skip}
            limit={LIMIT}
            totalCount={result.totalCount}
            basePath="/batches"
            searchParams={params}
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Courier</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Drops</TableHead>
              <TableHead className="text-right">Fare</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.data.map((batch) => {
              const { stops, delivered, failed, fare } = batch.summary;
              const rider = batch.rider;
              return (
                <TableRow key={batch._id} className="relative">
                  <TableCell className="tabular-nums">
                    <RowLink href={`/batches/${encodeURIComponent(batch.batchId)}`}>{batch.batchId}</RowLink>
                    <div className="text-[12.5px] whitespace-nowrap text-muted-foreground">
                      {formatDate(batch.createdAt)} · {batch.window ? humanize(batch.window) : 'Open window'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={batchStatusVariant(batch.status)} dot>
                      {batchStatusLabel(batch.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {rider ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span>{riderDisplayName(rider)}</span>
                          {rider.isInHouse && <Badge variant="secondary">In-house</Badge>}
                        </div>
                        <div className="text-[12.5px] text-muted-foreground tabular-nums">{formatPhone(rider.phone)}</div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">
                        {batch.declinedCount ? `None yet · ${batch.declinedCount} declined` : 'None yet'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>{humanize(batch.vehicleType)}</div>
                    <div className="text-[12.5px] text-muted-foreground">{humanize(batch.assignmentMode)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-positive"
                          style={{ width: `${stops ? (delivered / stops) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-[13px] tabular-nums">
                        {delivered} of {stops}
                      </span>
                      {failed > 0 && <span className="text-[12.5px] text-destructive">{failed} failed</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">₦ {fare.toLocaleString()}</TableCell>
                  <TableCell>
                    <RowChevron />
                  </TableCell>
                </TableRow>
              );
            })}
            {result.data.length === 0 && (
              <EmptyRow colSpan={7} title="No batches match" body="Clear the search, vehicle or tab." />
            )}
          </TableBody>
        </Table>
      </ListCard>
    </PageStack>
  );
}
