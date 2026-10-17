import Link from 'next/link';
import { authedFetch, ApiError, PaginatedResponse } from '@/lib/api-client';
import { AdminDelivery, Channel } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { SearchBox } from '@/components/search-box';
import { ChannelBadge } from '@/components/channel-badge';
import { ChannelFilter } from '@/components/channel-filter';
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
import { formatDate, humanize, statusBadgeVariant } from '@/lib/format';
import { StatStrip } from '@/components/stat-strip';
import { SegmentedLinks } from '@/components/segmented';
import {
  EmptyRow,
  ListCard,
  PageHeader,
  PageStack,
  RowChevron,
  RowLink,
  ToolbarEnd,
} from '@/components/page';

const LIMIT = 20;

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending payment' },
  { key: 'initialized', label: 'Checkout started' },
  { key: 'delivered', label: 'Confirmed' },
  { key: 'failed', label: 'Failed' },
  { key: 'bulk', label: 'Bulk' },
] as const;

function filterToQuery(filter: string): Record<string, string> {
  if (filter === 'delivered') return { status: 'confirmed' };
  if (filter === 'bulk') return { bulk: 'true' };
  if (filter !== 'all') return { status: filter };
  return {};
}

function customerName(user: AdminDelivery['user']) {
  if (!user || typeof user === 'string') return user || 'No name yet';
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'No name yet';
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
  const channel = params.channel ?? '';
  const filterQ = filterToQuery(activeFilter);

  const query = new URLSearchParams();
  query.set('skip', String(skip));
  query.set('limit', String(LIMIT));
  if (search) query.set('search', search);
  if (channel) query.set('channel', channel);
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
    { label: 'All deliveries', value: totalDeliveriesCount.toLocaleString() },
    { label: 'Pending payment', value: pendingCount.toLocaleString() },
    { label: 'Checkout started', value: initializedCount.toLocaleString() },
    { label: 'Confirmed', value: completedCount.toLocaleString() },
  ];

  const tabHref = (key: string) => {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (channel) p.set('channel', channel);
    if (key !== 'all') p.set('filter', key);
    const q = p.toString();
    return `/deliveries${q ? `?${q}` : ''}`;
  };
  const tabCounts: Record<string, number> = {
    all: totalDeliveriesCount,
    pending: pendingCount,
    initialized: initializedCount,
    delivered: completedCount,
  };

  return (
    <PageStack>
      <PageHeader title="Deliveries" subtitle="Standalone package deliveries, from the apps, the web, partners and bulk bookings." />

      <StatStrip stats={chips} />

      <ListCard
        toolbar={
          <>
            <SegmentedLinks
              active={activeFilter}
              items={FILTERS.map((f) => ({
                key: f.key,
                label: f.label,
                href: tabHref(f.key),
                count: tabCounts[f.key]?.toLocaleString(),
              }))}
            />
            <ChannelFilter />
            <ToolbarEnd>
              <SearchBox placeholder="Delivery ID" />
            </ToolbarEnd>
          </>
        }
        footer={
          <PaginationControls
            skip={skip}
            limit={LIMIT}
            totalCount={result.totalCount}
            basePath="/deliveries"
            searchParams={params}
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Delivery</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead className="text-right">Fee</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.data.map((delivery) => (
              <TableRow key={delivery._id} className="relative">
                <TableCell className="tabular-nums">
                  <div className="flex items-center gap-2">
                    <RowLink href={`/deliveries/${delivery._id}`}>{delivery.deliveryId}</RowLink>
                    {delivery.bulk && typeof delivery.bulk !== 'string' && (
                      <Link href={`/bulk-deliveries/${delivery.bulk._id}`} className="relative z-10">
                        <Badge variant="info">Bulk</Badge>
                      </Link>
                    )}
                  </div>
                  <div className="text-[12.5px] whitespace-nowrap text-muted-foreground">
                    {formatDate(delivery.createdAt)}
                  </div>
                </TableCell>
                <TableCell>
                  <div>{customerName(delivery.user)}</div>
                  <div className="text-[12.5px] text-muted-foreground">
                    {[delivery.requestType, delivery.deliveryOption].filter(Boolean).map(humanize).join(' · ') || '—'}
                  </div>
                </TableCell>
                <TableCell className="max-w-[260px]">
                  <div className="truncate text-foreground-secondary">{delivery.pickupAddress?.address || '—'}</div>
                  <div className="truncate text-[12.5px] text-muted-foreground">
                    to {delivery.dropoffAddress?.address || '—'}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant(delivery.status)} dot>
                    {humanize(delivery.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <ChannelBadge channel={delivery.channel as Channel | undefined} />
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  ₦ {(delivery.deliveryFee ?? 0).toLocaleString()}
                </TableCell>
                <TableCell>
                  <RowChevron />
                </TableCell>
              </TableRow>
            ))}
            {result.data.length === 0 && (
              <EmptyRow colSpan={7} title="No deliveries match" body="Clear the search, channel or tab." />
            )}
          </TableBody>
        </Table>
      </ListCard>
    </PageStack>
  );
}
