import Link from 'next/link';
import { authedFetch, ApiError, PaginatedResponse } from '@/lib/api-client';
import { AdminStaff } from '@/lib/types';
import { StaffRole } from '@/lib/permissions';
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
import { cn } from '@/lib/utils';
import { setStaffSuspended } from './actions';
import { InviteMemberDialog } from './_components/invite-member-dialog';
import { ChangeRoleDialog } from './_components/change-role-dialog';

const LIMIT = 20;

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'suspended', label: 'Suspended' },
] as const;

function filterToQuery(filter: string): Record<string, string> {
  if (filter === 'active') return { isActive: 'true' };
  if (filter === 'suspended') return { isActive: 'false' };
  return {};
}

function roleBadgeVariant(role: string) {
  if (role === StaffRole.SUPER_ADMIN) return 'destructive' as const;
  if (role === StaffRole.FINANCE) return 'info' as const;
  if (role === StaffRole.OPS) return 'warning' as const;
  return 'secondary' as const;
}

async function safeCount(url: string): Promise<number> {
  try {
    const r = await authedFetch<PaginatedResponse<unknown>>(url);
    return r.totalCount ?? 0;
  } catch {
    return 0;
  }
}

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const skip = Number(params.skip ?? 0);
  const search = params.search ?? '';
  const activeFilter = params.filter ?? 'all';
  const role = params.role ?? '';
  const filterQ = filterToQuery(activeFilter);

  const query = new URLSearchParams();
  query.set('skip', String(skip));
  query.set('limit', String(LIMIT));
  if (search) query.set('search', search);
  if (role) query.set('role', role);
  Object.entries(filterQ).forEach(([k, v]) => query.set(k, v));

  let result: PaginatedResponse<AdminStaff>;
  let totalCount = 0;
  let activeCount = 0;
  let suspendedCount = 0;

  try {
    [result, totalCount, activeCount, suspendedCount] = await Promise.all([
      authedFetch<PaginatedResponse<AdminStaff>>(`/admins/staff?${query.toString()}`),
      safeCount('/admins/staff?limit=1'),
      safeCount('/admins/staff?isActive=true&limit=1'),
      safeCount('/admins/staff?isActive=false&limit=1'),
    ]);
  } catch (error) {
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Something went wrong.'}
      />
    );
  }

  const chips = [
    { label: 'Total members', value: totalCount.toLocaleString() },
    { label: 'Active', value: activeCount.toLocaleString() },
    { label: 'Suspended', value: suspendedCount.toLocaleString() },
    { label: 'Roles', value: Object.values(StaffRole).length.toString() },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[23px] font-bold tracking-tight text-foreground">Staff</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Admin team members and their permissions
          </p>
        </div>
        <InviteMemberDialog />
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
          {STATUS_FILTERS.map((f) => {
            const active = activeFilter === f.key;
            const href = (() => {
              const p = new URLSearchParams();
              if (search) p.set('search', search);
              if (role) p.set('role', role);
              if (f.key !== 'all') p.set('filter', f.key);
              const s = p.toString();
              return `/staff${s ? `?${s}` : ''}`;
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
          <RoleSelect value={role} search={search} activeFilter={activeFilter} />
          <SearchBox placeholder="Search by name or email…" />
        </div>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.map((staff) => (
                <TableRow key={staff._id}>
                  <TableCell>
                    <Link href={`/staff/${staff._id}`} className="flex items-center gap-2.5">
                      <AvatarInitials name={`${staff.firstName} ${staff.lastName}`} size="sm" />
                      <span className="font-medium hover:underline">
                        {staff.firstName} {staff.lastName}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{staff.email}</TableCell>
                  <TableCell>
                    <ChangeRoleDialog
                      staffId={staff._id}
                      staffName={`${staff.firstName} ${staff.lastName}`}
                      role={staff.role}
                    />
                  </TableCell>
                  <TableCell>
                    <SuspendToggle
                      suspended={!staff.isActive}
                      action={setStaffSuspended.bind(null, staff._id)}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(staff.createdAt).split(',')[0]}
                  </TableCell>
                </TableRow>
              ))}
              {result.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No staff members found.
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
            basePath="/staff"
            searchParams={params}
          />
        </div>
      </div>
    </div>
  );
}

function RoleSelect({
  value,
  search,
  activeFilter,
}: {
  value: string;
  search: string;
  activeFilter: string;
}) {
  return (
    <form method="get" action="/staff" className="contents">
      {search && <input type="hidden" name="search" value={search} />}
      {activeFilter !== 'all' && <input type="hidden" name="filter" value={activeFilter} />}
      <select
        name="role"
        defaultValue={value}
        className="h-[34px] rounded-[9px] border border-border-strong bg-card px-3 text-[13px] font-semibold text-foreground-secondary outline-none"
      >
        <option value="">All roles</option>
        {Object.values(StaffRole).map((r) => (
          <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="text-[13px] text-primary">Go</button>
      </noscript>
    </form>
  );
}
