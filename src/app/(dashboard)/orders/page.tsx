import Link from 'next/link';
import { authedFetch, ApiError, PaginatedResponse } from '@/lib/api-client';
import { AdminOrder, AdminVendor, Channel } from '@/lib/types';
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
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'pending', label: 'Pending payment' },
  { key: 'failed', label: 'Failed' },
  { key: 'initialized', label: 'Checkout started' },
] as const;

function filterToQuery(filter: string): Record<string, string> {
  if (filter !== 'all') return { status: filter };
  return {};
}

function customerName(user: AdminOrder['user']) {
  if (!user || typeof user === 'string') return user || 'No name yet';
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'No name yet';
}

function vendorName(vendor: AdminOrder['vendor'], vendorMap: Map<string, string>) {
  if (!vendor) return '—';
  if (typeof vendor === 'string') return vendorMap.get(vendor) ?? '—';
  return vendor.businessName || vendor.name || '—';
}

async function safeCount(url: string): Promise<number> {
  try {
    const r = await authedFetch<PaginatedResponse<unknown>>(url);
    return r.totalCount ?? 0;
  } catch {
    return 0;
  }
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const skip = Number(params.skip ?? 0);
  const search = params.search ?? '';
  const activeFilter = params.filter ?? 'all';
  const vendor = params.vendor ?? '';
  const channel = params.channel ?? '';
  const filterQ = filterToQuery(activeFilter);

  const query = new URLSearchParams();
  query.set('skip', String(skip));
  query.set('limit', String(LIMIT));
  if (search) query.set('search', search);
  if (vendor) query.set('vendor', vendor);
  if (channel) query.set('channel', channel);
  Object.entries(filterQ).forEach(([k, v]) => query.set(k, v));

  let result: PaginatedResponse<AdminOrder>;
  let totalOrdersCount = 0;
  let confirmedCount = 0;
  let pendingCount = 0;
  let failedCount = 0;
  let vendors: AdminVendor[] = [];

  try {
    const vendorsRes = await authedFetch<PaginatedResponse<AdminVendor>>('/vendors?limit=200').catch(() => null);
    vendors = vendorsRes?.data ?? [];

    [result, totalOrdersCount, confirmedCount, pendingCount, failedCount] = await Promise.all([
      authedFetch<PaginatedResponse<AdminOrder>>(`/admins/orders?${query.toString()}`),
      safeCount('/admins/orders?limit=1'),
      safeCount('/admins/orders?status=confirmed&limit=1'),
      safeCount('/admins/orders?status=pending&limit=1'),
      safeCount('/admins/orders?status=failed&limit=1'),
    ]);
  } catch (error) {
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Something went wrong.'}
      />
    );
  }

  const vendorMap = new Map(vendors.map((v) => [v._id, v.businessName || v.name || '—']));

  const chips = [
    { label: 'All orders', value: totalOrdersCount.toLocaleString() },
    { label: 'Confirmed', value: confirmedCount.toLocaleString() },
    { label: 'Pending payment', value: pendingCount.toLocaleString() },
    { label: 'Failed', value: failedCount.toLocaleString() },
  ];

  const tabHref = (key: string) => {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (vendor) p.set('vendor', vendor);
    if (channel) p.set('channel', channel);
    if (key !== 'all') p.set('filter', key);
    const q = p.toString();
    return `/orders${q ? `?${q}` : ''}`;
  };
  const tabCounts: Record<string, number> = {
    all: totalOrdersCount,
    confirmed: confirmedCount,
    pending: pendingCount,
    failed: failedCount,
  };
  const vendorLabel = vendor ? vendorMap.get(vendor) : undefined;

  return (
    <PageStack>
      <PageHeader
        title="Orders"
        subtitle={
          vendorLabel ? (
            <>
              Orders from <strong className="font-medium text-foreground">{vendorLabel}</strong>.{' '}
              <Link href="/orders" className="text-primary hover:text-warning">
                Show all orders
              </Link>
            </>
          ) : (
            'Marketplace orders from customers, by payment and delivery stage.'
          )
        }
      />

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
              <SearchBox placeholder="Order ID or customer" />
            </ToolbarEnd>
          </>
        }
        footer={
          <PaginationControls
            skip={skip}
            limit={LIMIT}
            totalCount={result.totalCount}
            basePath="/orders"
            searchParams={params}
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Store</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.data.map((order) => (
              <TableRow key={order._id} className="relative">
                <TableCell className="tabular-nums">
                  <RowLink href={`/orders/${order._id}`}>{order.orderId}</RowLink>
                  <div className="text-[12.5px] whitespace-nowrap text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </div>
                </TableCell>
                <TableCell>{customerName(order.user)}</TableCell>
                <TableCell className="text-foreground-secondary">{vendorName(order.vendor, vendorMap)}</TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant(order.status)} dot>
                    {humanize(order.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant(order.orderDeliveryStatus)} dot>
                    {humanize(order.orderDeliveryStatus)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <ChannelBadge channel={order.channel as Channel | undefined} />
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  ₦ {(order.totalPrice ?? 0).toLocaleString()}
                </TableCell>
                <TableCell>
                  <RowChevron />
                </TableCell>
              </TableRow>
            ))}
            {result.data.length === 0 && (
              <EmptyRow colSpan={8} title="No orders match" body="Clear the search, channel or tab." />
            )}
          </TableBody>
        </Table>
      </ListCard>
    </PageStack>
  );
}
