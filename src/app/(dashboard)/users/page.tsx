import Link from 'next/link';
import { authedFetch, ApiError, PaginatedResponse } from '@/lib/api-client';
import { AdminUser } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { SearchBox } from '@/components/search-box';
import { PaginationControls } from '@/components/pagination-controls';
import { StatusPill } from '@/components/account-status';
import { AvatarInitials } from '@/components/avatar-initials';
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
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { SegmentedLinks } from '@/components/segmented';
import { DateRangeFilter } from './_components/date-range-filter';
import { ExportButton } from './_components/export-button';
import { StatStrip } from '@/components/stat-strip';

const LIMIT = 20;

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'customers', label: 'Customers' },
  { key: 'vendor-agents', label: 'Vendor agents' },
  { key: 'suspended', label: 'Suspended' },
] as const;

function filterToQuery(filter: string): Record<string, string> {
  if (filter === 'customers') return { role: 'customer' };
  if (filter === 'vendor-agents') return { role: 'vendorAgent' };
  if (filter === 'suspended') return { suspended: 'true' };
  return {};
}

function startOfWeekISO(): string {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun
  const daysBack = day === 0 ? 6 : day - 1; // Monday-anchored
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysBack));
  return monday.toISOString();
}

async function safeCount(url: string): Promise<number> {
  try {
    const r = await authedFetch<PaginatedResponse<unknown>>(url);
    return r.totalCount ?? 0;
  } catch {
    return 0;
  }
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const skip = Number(params.skip ?? 0);
  const search = params.search ?? '';
  const activeFilter = (params.filter ?? 'all') as string;
  const dateFrom = params.dateFrom ?? '';
  const dateTo = params.dateTo ?? '';
  const filterQ = filterToQuery(activeFilter);

  const query = new URLSearchParams();
  query.set('skip', String(skip));
  query.set('limit', String(LIMIT));
  if (search) query.set('search', search);
  if (dateFrom) query.set('createdFrom', dateFrom);
  if (dateTo) query.set('createdTo', dateTo);
  Object.entries(filterQ).forEach(([k, v]) => query.set(k, v));

  const weekStart = startOfWeekISO();

  let result: PaginatedResponse<AdminUser>;
  let customersCount = 0;
  let agentsCount = 0;
  let newThisWeek = 0;

  try {
    [result, customersCount, agentsCount, newThisWeek] = await Promise.all([
      authedFetch<PaginatedResponse<AdminUser>>(`/users/admin?${query.toString()}`),
      safeCount('/users/admin?role=customer&limit=1'),
      safeCount('/users/admin?role=vendorAgent&limit=1'),
      safeCount(`/users/admin?createdFrom=${encodeURIComponent(weekStart)}&limit=1`),
    ]);
  } catch (error) {
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Something went wrong.'}
      />
    );
  }

  const chips = [
    { label: 'Total users', value: result.totalCount.toLocaleString() },
    { label: 'Customers', value: customersCount.toLocaleString() },
    { label: 'Vendor agents', value: agentsCount.toLocaleString() },
    { label: 'New this week', value: `+${newThisWeek.toLocaleString()}` },
  ];

  // Carries the search box and the date range across, so switching tabs
  // narrows the current query instead of silently resetting it.
  const tabHref = (key: string) => {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (dateFrom) p.set('dateFrom', dateFrom);
    if (dateTo) p.set('dateTo', dateTo);
    if (key !== 'all') p.set('filter', key);
    const q = p.toString();
    return `/users${q ? `?${q}` : ''}`;
  };
  const tabCounts: Record<string, number | undefined> = {
    customers: customersCount,
    'vendor-agents': agentsCount,
  };

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">Customers and vendor agents with an Awarome account.</p>
        </div>
        <ExportButton />
      </div>

      <StatStrip stats={chips} />

      <section className="overflow-hidden rounded-[10px] border border-border bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3.5">
          <SegmentedLinks
            active={activeFilter}
            items={FILTERS.map((f) => ({
              key: f.key,
              label: f.label,
              href: tabHref(f.key),
              count: tabCounts[f.key]?.toLocaleString(),
            }))}
          />
          <DateRangeFilter />
          <div className="ml-auto w-full sm:w-auto">
            <SearchBox placeholder="Name, email or phone" />
          </div>
        </div>

        {result.data.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <span className="font-heading text-[18px] font-bold tracking-[-0.03em]">No users match</span>
            <span className="text-[14px] text-foreground-secondary">
              Nobody in this view right now. Clear the search or switch tabs.
            </span>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Heard via</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.map((user) => {
                const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
                return (
                  <TableRow key={user._id} className="relative cursor-pointer">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <AvatarInitials name={name || undefined} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/users/${user._id}`}
                              className={cn(
                                'font-medium after:absolute after:inset-0',
                                name ? 'text-foreground' : 'text-muted-foreground'
                              )}
                            >
                              {name || 'No name yet'}
                            </Link>
                            {!name && <Badge variant="warning">Incomplete profile</Badge>}
                          </div>
                          <div className="truncate text-[12.5px] text-muted-foreground">
                            {user.email || 'No email'}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-foreground-secondary tabular-nums">
                      {formatPhone(user.phone)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{humanize(user.role)}</Badge>
                    </TableCell>
                    <TableCell className="text-foreground-secondary">{humanize(user.source)}</TableCell>
                    <TableCell>
                      <StatusPill suspended={!!user.suspended} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-foreground-secondary tabular-nums">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      <ChevronRight className="ml-auto size-4" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        <div className="border-t border-border px-6 py-3.5">
          <PaginationControls
            skip={skip}
            limit={LIMIT}
            totalCount={result.totalCount}
            basePath="/users"
            searchParams={params}
          />
        </div>
      </section>
    </div>
  );
}
