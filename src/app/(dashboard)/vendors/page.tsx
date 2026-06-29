import Link from 'next/link';
import { authedFetch, ApiError, PaginatedResponse } from '@/lib/api-client';
import { AdminVendor } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { SearchBox } from '@/components/search-box';
import { PaginationControls } from '@/components/pagination-controls';
import { SuspendToggle } from '@/components/suspend-toggle';
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
import { formatDate } from '@/lib/format';
import { setVendorSuspended } from './actions';
import { cn } from '@/lib/utils';

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
    { label: 'Active vendors', value: activeCount.toLocaleString() },
    { label: 'Categories', value: categoriesCount.toLocaleString() },
    { label: 'New this month', value: `+${newThisMonth.toLocaleString()}` },
    { label: 'Suspended', value: suspendedCount.toLocaleString() },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[23px] font-bold tracking-tight text-foreground">Vendors</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">Stores selling on Awarome</p>
        </div>
        <Link href="/vendors/add" className={buttonVariants({ size: 'sm' })}>
          Add vendor
        </Link>
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

      {/* Toolbar: filter pills + search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => {
            const active = activeFilter === f.key;
            const href = (() => {
              const p = new URLSearchParams();
              if (search) p.set('search', search);
              if (f.key !== 'all') p.set('filter', f.key);
              const s = p.toString();
              return `/vendors${s ? `?${s}` : ''}`;
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
        <SearchBox placeholder="Search by name or address…" />
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.map((vendor) => {
                const displayName = vendor.businessName || vendor.name || '—';
                return (
                  <TableRow key={vendor._id} className="cursor-pointer">
                    <TableCell>
                      <Link href={`/vendors/${vendor._id}`} className="flex items-center gap-2.5">
                        <AvatarInitials name={displayName} size="sm" />
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-foreground hover:underline">
                            {displayName}
                            {vendor.isTestVendor && (
                              <Badge variant="secondary" className="ml-1.5 align-middle">
                                test
                              </Badge>
                            )}
                          </span>
                          {(vendor.city || vendor.address) && (
                            <span className="text-[12px] text-muted-foreground">
                              {vendor.city || vendor.address}
                            </span>
                          )}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>{vendor.email || '—'}</TableCell>
                    <TableCell>{vendor.phone || '—'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {vendor.type?.length ? (
                          vendor.type.map((t) => (
                            <span
                              key={t}
                              className="rounded-[6px] bg-chip px-2 py-0.5 text-[11.5px] font-medium text-foreground-secondary"
                            >
                              {t.replace(/_/g, ' ')}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <SuspendToggle
                        suspended={!!vendor.suspended}
                        action={setVendorSuspended.bind(null, vendor._id)}
                      />
                    </TableCell>
                    <TableCell>{formatDate(vendor.createdAt)}</TableCell>
                  </TableRow>
                );
              })}
              {result.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No vendors found.
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
            basePath="/vendors"
            searchParams={params}
          />
        </div>
      </div>
    </div>
  );
}
