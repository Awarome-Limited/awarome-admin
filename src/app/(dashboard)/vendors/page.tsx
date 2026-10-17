import Link from 'next/link';
import { authedFetch, ApiError, PaginatedResponse } from '@/lib/api-client';
import { AdminVendor } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { SearchBox } from '@/components/search-box';
import { PaginationControls } from '@/components/pagination-controls';
import { StatusPill } from '@/components/account-status';
import { AvatarInitials } from '@/components/avatar-initials';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { formatDate, formatPhone, humanize } from '@/lib/format';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  { key: 'active', label: 'Active' },
  { key: 'suspended', label: 'Suspended' },
] as const;

function filterToQuery(filter: string): Record<string, string> {
  if (filter === 'active') return { suspended: 'false' };
  if (filter === 'suspended') return { suspended: 'true' };
  return {};
}

function startOfMonthISO(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

async function safeCount(url: string): Promise<number> {
  try {
    const r = await authedFetch<PaginatedResponse<unknown>>(url);
    return r.totalCount ?? 0;
  } catch {
    return 0;
  }
}

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const skip = Number(params.skip ?? 0);
  const search = params.search ?? '';
  const activeFilter = (params.filter ?? 'all') as string;
  const filterQ = filterToQuery(activeFilter);

  const query = new URLSearchParams();
  query.set('skip', String(skip));
  query.set('limit', String(LIMIT));
  if (search) query.set('search', search);
  Object.entries(filterQ).forEach(([k, v]) => query.set(k, v));

  const monthStart = startOfMonthISO();

  let result: PaginatedResponse<AdminVendor>;
  let totalAllVendors = 0;
  let categoriesCount = 0;
  let newThisMonth = 0;
  let suspendedCount = 0;

  try {
    // skip=1 on safeCount calls: the backend resets limit→0 when skip is absent
    // (pagination.skip defaults to 0, and !0 === true triggers the reset).
    // Sending skip=1 keeps the string truthy so limit=1 is honoured.
    [result, totalAllVendors, categoriesCount, newThisMonth, suspendedCount] = await Promise.all([
      authedFetch<PaginatedResponse<AdminVendor>>(`/vendors/admin?${query.toString()}`),
      safeCount('/vendors/admin?skip=1&limit=1'),
      safeCount('/products/categories?limit=1'),
      safeCount(`/vendors/admin?createdFrom=${encodeURIComponent(monthStart)}&skip=1&limit=1`),
      safeCount('/vendors/admin?suspended=true&skip=1&limit=1'),
    ]);
  } catch (error) {
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Something went wrong.'}
      />
    );
  }

  const activeCount = Math.max(0, totalAllVendors - suspendedCount);

  const chips = [
    { label: 'All vendors', value: totalAllVendors.toLocaleString() },
    { label: 'Active', value: activeCount.toLocaleString() },
    { label: 'New this month', value: `+${newThisMonth.toLocaleString()}` },
    { label: 'Product categories', value: categoriesCount.toLocaleString() },
  ];

  const tabHref = (key: string) => {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (key !== 'all') p.set('filter', key);
    const q = p.toString();
    return `/vendors${q ? `?${q}` : ''}`;
  };
  const tabCounts: Record<string, number> = {
    all: totalAllVendors,
    active: activeCount,
    suspended: suspendedCount,
  };

  return (
    <PageStack>
      <PageHeader
        title="Vendors"
        subtitle="Stores selling on Awarome."
        actions={
          <Link href="/vendors/add" className={buttonVariants()}>
            <Plus />
            Add vendor
          </Link>
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
            <ToolbarEnd>
              <SearchBox placeholder="Store name or address" />
            </ToolbarEnd>
          </>
        }
        footer={
          <PaginationControls
            skip={skip}
            limit={LIMIT}
            totalCount={result.totalCount}
            basePath="/vendors"
            searchParams={params}
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Store</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.data.map((vendor) => {
              const displayName = vendor.businessName || vendor.name;
              return (
                <TableRow key={vendor._id} className="relative">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <AvatarInitials name={displayName || undefined} shape="store" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <RowLink
                            href={`/vendors/${vendor._id}`}
                            className={cn(!displayName && 'text-muted-foreground')}
                          >
                            {displayName || 'No name yet'}
                          </RowLink>
                          {vendor.isTestVendor && <Badge variant="secondary">Test</Badge>}
                        </div>
                        <div className="truncate text-[12.5px] text-muted-foreground">
                          {vendor.city || vendor.address || 'No address'}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-foreground-secondary tabular-nums">{formatPhone(vendor.phone)}</div>
                    <div className="truncate text-[12.5px] text-muted-foreground">{vendor.email || 'No email'}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {vendor.type?.length ? (
                        vendor.type.map((t) => (
                          <Badge key={t} variant="secondary">
                            {humanize(t)}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusPill suspended={!!vendor.suspended} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-foreground-secondary tabular-nums">
                    {formatDate(vendor.createdAt)}
                  </TableCell>
                  <TableCell>
                    <RowChevron />
                  </TableCell>
                </TableRow>
              );
            })}
            {result.data.length === 0 && (
              <EmptyRow
                colSpan={6}
                title="No vendors match"
                body="Clear the search or switch tabs, or add a vendor."
              />
            )}
          </TableBody>
        </Table>
      </ListCard>
    </PageStack>
  );
}
