import Link from 'next/link';
import { authedFetch, ApiError, PaginatedResponse } from '@/lib/api-client';
import { AdminUser } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { SearchBox } from '@/components/search-box';
import { PaginationControls } from '@/components/pagination-controls';
import { SuspendToggle } from '@/components/suspend-toggle';
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
import { formatDate } from '@/lib/format';
import { setUserSuspended } from './actions';
import { cn } from '@/lib/utils';
import { DateRangeFilter } from './_components/date-range-filter';
import { ExportButton } from './_components/export-button';

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

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h1 className="text-[23px] font-bold tracking-tight text-foreground">Users</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">Customers and vendor agents</p>
      </div>

      {/* Stat chips */}
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

      {/* Toolbar */}
      <div className="flex flex-col gap-2.5">
        {/* Row 1: filter pills + search + export */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((f) => {
              const active = activeFilter === f.key;
              const href = (() => {
                const p = new URLSearchParams();
                if (search) p.set('search', search);
                if (f.key !== 'all') p.set('filter', f.key);
                const s = p.toString();
                return `/users${s ? `?${s}` : ''}`;
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
          <div className="flex flex-wrap items-center gap-2">
            <SearchBox placeholder="Search by name, email, phone…" />
            <ExportButton />
          </div>
        </div>

        {/* Row 2: date range filter */}
        <div className="flex items-center">
          <DateRangeFilter />
        </div>
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.map((user) => (
                <TableRow key={user._id} className="cursor-pointer">
                  <TableCell>
                    <Link href={`/users/${user._id}`} className="flex items-center gap-2.5">
                      <AvatarInitials
                        name={`${user.firstName ?? ''} ${user.lastName ?? ''}`}
                        size="sm"
                      />
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-foreground hover:underline">
                          {[user.firstName, user.lastName].filter(Boolean).join(' ') || '—'}
                        </span>
                        <span className="text-[12px] text-muted-foreground">{user.email}</span>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>{user.phone || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.role}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.source || '—'}
                  </TableCell>
                  <TableCell>
                    <SuspendToggle
                      suspended={!!user.suspended}
                      action={setUserSuspended.bind(null, user._id)}
                    />
                  </TableCell>
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                </TableRow>
              ))}
              {result.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No users found.
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
            basePath="/users"
            searchParams={params}
          />
        </div>
      </div>
    </div>
  );
}
