import { authedFetch, ApiError, PaginatedResponse } from '@/lib/api-client';
import { AdminStaff } from '@/lib/types';
import { StaffRole } from '@/lib/permissions';
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
import { formatDate, humanize } from '@/lib/format';
import { ROLE_LABELS } from '@/lib/staff-roles';
import { InviteMemberDialog } from './_components/invite-member-dialog';
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
    { label: 'Team members', value: totalCount.toLocaleString() },
    { label: 'Active', value: activeCount.toLocaleString() },
    { label: 'Suspended', value: suspendedCount.toLocaleString() },
  ];

  const tabHref = (key: string) => {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (role) p.set('role', role);
    if (key !== 'all') p.set('filter', key);
    const q = p.toString();
    return `/staff${q ? `?${q}` : ''}`;
  };
  const tabCounts: Record<string, number> = { all: totalCount, active: activeCount, suspended: suspendedCount };

  return (
    <PageStack>
      <PageHeader
        title="Staff"
        subtitle="Admin team members, their roles and what they can do."
        actions={<InviteMemberDialog />}
      />

      <StatStrip stats={chips} />

      <ListCard
        toolbar={
          <>
            <SegmentedLinks
              active={activeFilter}
              items={STATUS_FILTERS.map((f) => ({
                key: f.key,
                label: f.label,
                href: tabHref(f.key),
                count: tabCounts[f.key]?.toLocaleString(),
              }))}
            />
            <RoleSelect value={role} search={search} activeFilter={activeFilter} />
            <ToolbarEnd>
              <SearchBox placeholder="Name or email" />
            </ToolbarEnd>
          </>
        }
        footer={
          <PaginationControls
            skip={skip}
            limit={LIMIT}
            totalCount={result.totalCount}
            basePath="/staff"
            searchParams={params}
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.data.map((staff) => {
              const name = [staff.firstName, staff.lastName].filter(Boolean).join(' ');
              return (
                <TableRow key={staff._id} className="relative">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <AvatarInitials name={name || undefined} />
                      <div className="min-w-0">
                        <RowLink href={`/staff/${staff._id}`}>{name || 'No name yet'}</RowLink>
                        <div className="truncate text-[12.5px] text-muted-foreground">{staff.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={staff.role === StaffRole.SUPER_ADMIN ? 'info' : 'secondary'}>
                      {ROLE_LABELS[staff.role as StaffRole] ?? humanize(staff.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StatusPill suspended={!staff.isActive} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-foreground-secondary tabular-nums">
                    {formatDate(staff.createdAt).split(',')[0]}
                  </TableCell>
                  <TableCell>
                    <RowChevron />
                  </TableCell>
                </TableRow>
              );
            })}
            {result.data.length === 0 && (
              <EmptyRow colSpan={5} title="No staff match" body="Clear the search, role or tab." />
            )}
          </TableBody>
        </Table>
      </ListCard>
    </PageStack>
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
        aria-label="Role"
        defaultValue={value}
        className="toolbar-select"
      >
        <option value="">All roles</option>
        {Object.values(StaffRole).map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="text-[13px] text-primary">Go</button>
      </noscript>
    </form>
  );
}
