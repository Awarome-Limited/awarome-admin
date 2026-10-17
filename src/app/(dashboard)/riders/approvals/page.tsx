import Link from 'next/link';
import { authedFetch, ApiError, PaginatedResponse } from '@/lib/api-client';
import { AdminRider } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { SearchBox } from '@/components/search-box';
import { PaginationControls } from '@/components/pagination-controls';
import { ConfirmActionButton } from '@/components/confirm-action-button';
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
import { RiderDocumentsStrip } from '@/components/rider-documents';
import { cn } from '@/lib/utils';
import { updateRiderProfileStatus } from '../actions';
import { StatStrip } from '@/components/stat-strip';
import { SegmentedLinks } from '@/components/segmented';
import { EmptyRow, ListCard, PageHeader, PageStack, ToolbarEnd } from '@/components/page';

const LIMIT = 20;

const FILTERS = [
  { key: 'pending', label: 'Pending review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
] as const;

function filterToQuery(filter: string): Record<string, string> {
  if (filter === 'pending') return { verificationStatus: 'pending' };
  if (filter === 'approved') return { verificationStatus: 'approved' };
  if (filter === 'rejected') return { verificationStatus: 'rejected' };
  return {};
}

async function safeCount(url: string): Promise<number> {
  try {
    const r = await authedFetch<PaginatedResponse<unknown>>(url);
    return r?.totalCount ?? 0;
  } catch {
    return 0;
  }
}

export default async function RiderApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const skip = Number(params.skip ?? 0);
  const search = params.search ?? '';
  const activeFilter = params.filter ?? 'pending';
  const filterQ = filterToQuery(activeFilter);

  const query = new URLSearchParams();
  query.set('skip', String(skip));
  query.set('limit', String(LIMIT));
  if (search) query.set('search', search);
  Object.entries(filterQ).forEach(([k, v]) => query.set(k, v));

  let result: PaginatedResponse<AdminRider> | undefined;
  let totalCount = 0;
  let pendingCount = 0;
  let approvedCount = 0;
  let rejectedCount = 0;

  try {
    [result, totalCount, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      authedFetch<PaginatedResponse<AdminRider>>(`/riders/admin?${query.toString()}`),
      safeCount('/riders/admin?limit=1'),
      safeCount('/riders/admin?verificationStatus=pending&limit=1'),
      safeCount('/riders/admin?verificationStatus=approved&limit=1'),
      safeCount('/riders/admin?verificationStatus=rejected&limit=1'),
    ]);
  } catch (error) {
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Something went wrong.'}
      />
    );
  }

  const ridersList: AdminRider[] = Array.isArray(result?.data)
    ? result.data
    : Array.isArray((result?.data as any)?.riders)
    ? (result?.data as any).riders
    : [];

  const listTotalCount = result?.totalCount ?? totalCount ?? ridersList.length;

  const chips = [
    { label: 'Waiting for review', value: pendingCount.toLocaleString() },
    { label: 'Approved', value: approvedCount.toLocaleString() },
    { label: 'Rejected', value: rejectedCount.toLocaleString() },
    { label: 'All riders', value: totalCount.toLocaleString() },
  ];

  const tabHref = (key: string) => {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (key !== 'pending') p.set('filter', key);
    const q = p.toString();
    return `/riders/approvals${q ? `?${q}` : ''}`;
  };
  const tabCounts: Record<string, number> = {
    pending: pendingCount,
    approved: approvedCount,
    rejected: rejectedCount,
    all: totalCount,
  };

  return (
    <PageStack>
      <PageHeader
        title="Rider approvals"
        subtitle="Check documents and vehicle details, then approve riders so they can be dispatched."
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
              <SearchBox placeholder="Name, email or phone" />
            </ToolbarEnd>
          </>
        }
        footer={
          <PaginationControls
            skip={skip}
            limit={LIMIT}
            totalCount={listTotalCount}
            basePath="/riders/approvals"
            searchParams={params}
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rider</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Documents</TableHead>
              <TableHead>Verification</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead className="text-right">Decision</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ridersList.map((rider) => {
              const vStatus = rider.verificationStatus || (rider.suspended ? 'rejected' : 'pending');
              const isApproved = vStatus === 'approved';
              const isRejected = vStatus === 'rejected';
              const name = [rider.firstName, rider.lastName].filter(Boolean).join(' ');

              return (
                <TableRow key={rider._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <AvatarInitials name={name || undefined} />
                      <div className="min-w-0">
                        <Link
                          href={`/riders/${rider._id}`}
                          className={cn('font-medium hover:text-primary', !name && 'text-muted-foreground')}
                        >
                          {name || 'No name yet'}
                        </Link>
                        <div className="truncate text-[12.5px] text-muted-foreground tabular-nums">
                          {[rider.email, rider.phone && formatPhone(rider.phone)].filter(Boolean).join(' · ') ||
                            'No contact details'}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant="secondary">{humanize(rider.vehicleType || 'bike')}</Badge>
                      {rider.plateNumber && (
                        <span className="text-[12.5px] text-muted-foreground uppercase tabular-nums">
                          {rider.plateNumber}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <RiderDocumentsStrip documents={rider.documents} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={isApproved ? 'positive' : isRejected ? 'destructive' : 'info'} dot>
                      {isApproved
                        ? 'Approved'
                        : isRejected
                          ? 'Rejected'
                          : vStatus === 'unsubmitted'
                            ? 'Not submitted'
                            : 'Waiting for review'}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-foreground-secondary tabular-nums">
                    {formatDate(rider.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!isApproved && (
                        <ConfirmActionButton
                          label="Approve"
                          title="Approve this rider?"
                          description={`${name || 'This rider'} can start receiving jobs as soon as you approve.`}
                          variant="default"
                          action={async () => {
                            'use server';
                            await updateRiderProfileStatus(rider._id, 'approved');
                          }}
                        />
                      )}
                      {!isRejected && (
                        <ConfirmActionButton
                          label="Reject"
                          title="Reject this rider?"
                          description={`${name || 'This rider'} won’t be able to receive jobs.`}
                          variant="destructive"
                          action={async () => {
                            'use server';
                            await updateRiderProfileStatus(rider._id, 'rejected');
                          }}
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {ridersList.length === 0 && (
              <EmptyRow
                colSpan={6}
                title={activeFilter === 'pending' ? 'No one is waiting' : 'No riders match'}
                body={
                  activeFilter === 'pending'
                    ? 'Every application has been reviewed. New sign-ups show up here.'
                    : 'Clear the search or switch tabs.'
                }
              />
            )}
          </TableBody>
        </Table>
      </ListCard>
    </PageStack>
  );
}
