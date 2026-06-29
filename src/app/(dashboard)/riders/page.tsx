import Link from 'next/link';
import { authedFetch, ApiError, PaginatedResponse } from '@/lib/api-client';
import { AdminRider } from '@/lib/types';
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
import { statusBadgeVariant } from '@/lib/format';
import { cn } from '@/lib/utils';
import { setRiderSuspended } from './actions';

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

async function safeCount(url: string): Promise<number> {
  try {
    const r = await authedFetch<PaginatedResponse<unknown>>(url);
    return r.totalCount ?? 0;
  } catch {
    return 0;
  }
}

export default async function RidersPage({
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

  let result: PaginatedResponse<AdminRider>;
  let totalCount = 0;
  let activeCount = 0;
  let suspendedCount = 0;

  try {
    [result, totalCount, activeCount, suspendedCount] = await Promise.all([
      authedFetch<PaginatedResponse<AdminRider>>(`/riders/admin?${query.toString()}`),
      safeCount('/riders/admin?limit=1'),
      safeCount('/riders/admin?suspended=false&limit=1'),
      safeCount('/riders/admin?suspended=true&limit=1'),
    ]);
  } catch (error) {
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Something went wrong.'}
      />
    );
  }

  const chips = [
    { label: 'Total riders', value: totalCount.toLocaleString() },
    { label: 'Active', value: activeCount.toLocaleString() },
    { label: 'Suspended', value: suspendedCount.toLocaleString() },
    { label: 'Orders completed', value: result.data.reduce((s, r) => s + (r.ordersCompleted ?? 0), 0).toLocaleString() },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-[23px] font-bold tracking-tight text-foreground">Riders</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">Delivery riders on the platform</p>
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
              return `/riders${s ? `?${s}` : ''}`;
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
        <SearchBox placeholder="Search by name, email, phone…" />
      </div>

      <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Online status</TableHead>
                <TableHead className="text-right">Orders completed</TableHead>
                <TableHead>Account status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.map((rider) => (
                <TableRow key={rider._id}>
                  <TableCell>
                    <Link href={`/riders/${rider._id}`} className="flex items-center gap-2.5">
                      <AvatarInitials name={`${rider.firstName ?? ''} ${rider.lastName ?? ''}`} size="sm" />
                      <span className="font-medium hover:underline">
                        {rider.firstName} {rider.lastName}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{rider.email || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{rider.phone || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(rider.status)} dot>
                      {rider.status || '—'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {rider.ordersCompleted ?? 0}
                  </TableCell>
                  <TableCell>
                    <SuspendToggle
                      suspended={!!rider.suspended}
                      action={setRiderSuspended.bind(null, rider._id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {result.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No riders found.
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
            basePath="/riders"
            searchParams={params}
          />
        </div>
      </div>
    </div>
  );
}
