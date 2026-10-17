import Link from 'next/link';
import { authedFetch, ApiError, PaginatedResponse } from '@/lib/api-client';
import { AdminRider } from '@/lib/types';
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
import { formatPhone, humanize, statusBadgeVariant } from '@/lib/format';
import { cn } from '@/lib/utils';
import { getSession } from '@/lib/session';
import { hasPermission, PermissionAction, PermissionModule } from '@/lib/permissions';
import { BackfillCollectionAccounts } from './_components/backfill-collection-accounts';
import { StatStrip } from '@/components/stat-strip';
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

const LIMIT = 20;

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'owing', label: 'Owes commission' },
  { key: 'over-limit', label: 'Over debt limit' },
] as const;

function filterToQuery(filter: string): Record<string, string> {
  if (filter === 'active') return { suspended: 'false' };
  if (filter === 'suspended') return { suspended: 'true' };
  if (filter === 'owing') return { owing: 'any' };
  if (filter === 'over-limit') return { owing: 'over-limit' };
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
  let owingCount = 0;
  let overLimitCount = 0;

  try {
    [result, totalCount, activeCount, suspendedCount, owingCount, overLimitCount] = await Promise.all([
      authedFetch<PaginatedResponse<AdminRider>>(`/riders/admin?${query.toString()}`),
      safeCount('/riders/admin?limit=1'),
      safeCount('/riders/admin?suspended=false&limit=1'),
      safeCount('/riders/admin?suspended=true&limit=1'),
      safeCount('/riders/admin?owing=any&limit=1'),
      safeCount('/riders/admin?owing=over-limit&limit=1'),
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
    { label: 'Active', value: activeCount.toLocaleString(), meta: `${suspendedCount.toLocaleString()} suspended` },
    { label: 'Owe commission', value: owingCount.toLocaleString() },
    { label: 'Over debt limit', value: overLimitCount.toLocaleString(), meta: 'Locked out of new jobs' },
  ];

  const session = await getSession();
  const canUpdateRiders =
    !!session && hasPermission(session.profile, PermissionModule.RIDERS, PermissionAction.UPDATE);

  const tabHref = (key: string) => {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (key !== 'all') p.set('filter', key);
    const q = p.toString();
    return `/riders${q ? `?${q}` : ''}`;
  };
  const tabCounts: Record<string, number> = {
    all: totalCount,
    active: activeCount,
    suspended: suspendedCount,
    owing: owingCount,
    'over-limit': overLimitCount,
  };

  return (
    <PageStack>
      <PageHeader
        title="Riders"
        subtitle="Delivery riders on the platform, their status and what they owe Awarome."
        actions={canUpdateRiders && <BackfillCollectionAccounts />}
      />

      <StatStrip stats={chips} />

      {overLimitCount > 0 && activeFilter !== 'over-limit' && (
        <InlineNotice action={<Link href={tabHref('over-limit')}>Show them</Link>}>
          {overLimitCount === 1 ? '1 rider is' : `${overLimitCount.toLocaleString()} riders are`} over the
          debt limit and won’t be offered new jobs until they pay.
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
                href: tabHref(f.key),
                count: tabCounts[f.key]?.toLocaleString(),
              }))}
            />
            <ToolbarEnd>
              <SearchBox placeholder="Name, email or phone" />
            </ToolbarEnd>
          </>
        }
        footer={
          <PaginationControls
            skip={skip}
            limit={LIMIT}
            totalCount={result.totalCount}
            basePath="/riders"
            searchParams={params}
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rider</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Presence</TableHead>
              <TableHead className="text-right">Completed</TableHead>
              <TableHead className="text-right">Owes Awarome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.data.map((rider) => {
              const name = [rider.firstName, rider.lastName].filter(Boolean).join(' ');
              return (
                <TableRow key={rider._id} className="relative">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <AvatarInitials name={name || undefined} />
                      <div className="min-w-0">
                        <RowLink href={`/riders/${rider._id}`} className={cn(!name && 'text-muted-foreground')}>
                          {name || 'No name yet'}
                        </RowLink>
                        <div className="truncate text-[12.5px] text-muted-foreground">
                          {rider.email || 'No email'}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-foreground-secondary tabular-nums">
                    {formatPhone(rider.phone)}
                  </TableCell>
                  <TableCell>
                    {rider.status ? (
                      <Badge variant={statusBadgeVariant(rider.status)} dot>
                        {humanize(rider.status)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {(rider.ordersCompleted ?? 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {rider.owed ? (
                      <span className="inline-flex items-center justify-end gap-2">
                        <span className={cn('font-medium', rider.debtLocked && 'text-destructive')}>
                          ₦ {rider.owed.toLocaleString('en-NG')}
                        </span>
                        {rider.debtLocked && <Badge variant="destructive">Over limit</Badge>}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusPill suspended={!!rider.suspended} />
                  </TableCell>
                  <TableCell>
                    <RowChevron />
                  </TableCell>
                </TableRow>
              );
            })}
            {result.data.length === 0 && (
              <EmptyRow
                colSpan={7}
                title="No riders match"
                body="Nobody in this view right now. Clear the search or switch tabs."
              />
            )}
          </TableBody>
        </Table>
      </ListCard>
    </PageStack>
  );
}
