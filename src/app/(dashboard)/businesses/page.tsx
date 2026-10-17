import { authedFetch, ApiError } from '@/lib/api-client';
import type { AdminBusiness } from '@/lib/types';
import { getSession } from '@/lib/session';
import { hasPermission, PermissionAction, PermissionModule } from '@/lib/permissions';
import { ApiErrorCard } from '@/components/api-error-card';
import { PaginationControls } from '@/components/pagination-controls';
import { SearchBox } from '@/components/search-box';
import { StatusPill } from '@/components/account-status';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, humanize } from '@/lib/format';
import { AvatarInitials } from '@/components/avatar-initials';
import { CreateBusinessDialog } from './_components/create-business-dialog';
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
];

interface BusinessList {
  data: AdminBusiness[];
  skip: number;
  limit: number;
  totalCount: number;
  stats: { active: number; suspended: number };
}

export default async function BusinessesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const skip = Number(params.skip ?? 0);
  const search = params.search ?? '';
  const filter = params.filter ?? 'all';
  const session = await getSession();
  const canCreate = !!session && hasPermission(session.profile, PermissionModule.BUSINESSES, PermissionAction.CREATE);

  const query = new URLSearchParams({ skip: String(skip), limit: String(LIMIT) });
  if (search) query.set('search', search);
  if (filter !== 'all') query.set('status', filter);

  let result: BusinessList;
  try {
    result = await authedFetch<BusinessList>(`/admins/businesses?${query.toString()}`);
  } catch (error) {
    return <ApiErrorCard message={error instanceof ApiError ? error.message : 'Something went wrong.'} />;
  }

  const chips = [
    { label: 'Businesses', value: (result.stats.active + result.stats.suspended).toLocaleString() },
    { label: 'Active', value: result.stats.active.toLocaleString() },
    { label: 'Suspended', value: result.stats.suspended.toLocaleString() },
  ];
  const noPayoutAccount = result.data.filter((b) => !b.payoutAccount && b.status === 'active').length;

  const tabHref = (key: string) => {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (key !== 'all') p.set('filter', key);
    const q = p.toString();
    return `/businesses${q ? `?${q}` : ''}`;
  };
  const tabCounts: Record<string, number> = {
    all: result.stats.active + result.stats.suspended,
    active: result.stats.active,
    suspended: result.stats.suspended,
  };

  return (
    <PageStack>
      <PageHeader
        title="Businesses"
        subtitle="Logistics businesses booking pay-on-delivery runs at business.awarome.com."
        actions={canCreate && <CreateBusinessDialog />}
      />

      <StatStrip stats={chips} />

      {noPayoutAccount > 0 && (
        <InlineNotice>
          {noPayoutAccount === 1 ? '1 business' : `${noPayoutAccount} businesses`} on this page{' '}
          {noPayoutAccount === 1 ? 'has' : 'have'} no payout account, so the money they collect is held until the
          owner adds one.
        </InlineNotice>
      )}

      <ListCard
        toolbar={
          <>
            <SegmentedLinks
              active={filter}
              items={FILTERS.map((f) => ({
                key: f.key,
                label: f.label,
                href: tabHref(f.key),
                count: tabCounts[f.key]?.toLocaleString(),
              }))}
            />
            <ToolbarEnd>
              <SearchBox placeholder="Business name" />
            </ToolbarEnd>
          </>
        }
        footer={
          <PaginationControls
            skip={skip}
            limit={LIMIT}
            totalCount={result.totalCount}
            basePath="/businesses"
            searchParams={params}
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Payout account</TableHead>
              <TableHead className="text-right">Deliveries</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.data.map((b) => (
              <TableRow key={b.id} className="relative">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <AvatarInitials name={b.name || undefined} shape="store" />
                    <div className="min-w-0">
                      <RowLink href={`/businesses/${b.id}`}>{b.name || 'No name yet'}</RowLink>
                      <div className="max-w-[280px] truncate text-[12.5px] text-muted-foreground">
                        {b.pickupAddress?.text || 'No pickup address'}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {b.owner ? (
                    <>
                      <div>{b.owner.name || b.owner.email}</div>
                      <div className="text-[12.5px] text-muted-foreground">
                        {b.owner.status === 'invited' ? 'Invite pending' : b.owner.email}
                      </div>
                    </>
                  ) : (
                    <Badge variant="warning">No owner</Badge>
                  )}
                </TableCell>
                <TableCell className="text-foreground-secondary tabular-nums">
                  {b.payoutAccount ? (
                    `${b.payoutAccount.bankName} ••${b.payoutAccount.last4}`
                  ) : (
                    <Badge variant="warning">Not set</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">{(b.deliveries ?? 0).toLocaleString()}</TableCell>
                <TableCell>
                  {b.status === 'active' || b.status === 'suspended' ? (
                    <StatusPill suspended={b.status === 'suspended'} />
                  ) : (
                    <Badge variant="secondary">{humanize(b.status)}</Badge>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap text-foreground-secondary tabular-nums">
                  {formatDate(b.createdAt)}
                </TableCell>
                <TableCell>
                  <RowChevron />
                </TableCell>
              </TableRow>
            ))}
            {result.data.length === 0 && (
              <EmptyRow
                colSpan={7}
                title={search || filter !== 'all' ? 'No businesses match' : 'No businesses yet'}
                body={
                  search || filter !== 'all'
                    ? 'Clear the search or switch tabs.'
                    : 'Onboard a business to let them book pay-on-delivery runs.'
                }
              />
            )}
          </TableBody>
        </Table>
      </ListCard>
    </PageStack>
  );
}
