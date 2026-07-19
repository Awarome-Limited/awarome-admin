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
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { updateRiderProfileStatus } from '../actions';

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
    return r.totalCount ?? 0;
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

  let result: PaginatedResponse<AdminRider>;
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

  const chips = [
    { label: 'Pending approval', value: pendingCount.toLocaleString() },
    { label: 'Approved', value: approvedCount.toLocaleString() },
    { label: 'Rejected', value: rejectedCount.toLocaleString() },
    { label: 'Total riders', value: totalCount.toLocaleString() },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[23px] font-bold tracking-tight text-foreground">Rider Approvals</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Review rider verification applications, vehicle details, and grant access to order dispatches
          </p>
        </div>
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
              if (f.key !== 'pending') p.set('filter', f.key);
              const s = p.toString();
              return `/riders/approvals${s ? `?${s}` : ''}`;
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
        <SearchBox placeholder="Search rider profile by name, email, phone…" />
      </div>

      <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rider</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Vehicle & Plate</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.map((rider) => {
                const vStatus = rider.verificationStatus || (rider.suspended ? 'rejected' : 'pending');
                const isApproved = vStatus === 'approved';
                const isRejected = vStatus === 'rejected';

                return (
                  <TableRow key={rider._id}>
                    <TableCell>
                      <Link href={`/riders/${rider._id}`} className="flex items-center gap-2.5">
                        <AvatarInitials name={`${rider.firstName ?? ''} ${rider.lastName ?? ''}`} size="sm" />
                        <div>
                          <div className="font-semibold text-foreground hover:underline">
                            {rider.firstName} {rider.lastName}
                          </div>
                          <div className="text-[12px] text-muted-foreground">{rider.email || '—'}</div>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-[13px] text-muted-foreground">{rider.phone || '—'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="w-fit rounded bg-chip px-2 py-0.5 text-xs font-medium capitalize text-foreground-secondary">
                          {rider.vehicleType || 'Bike'}
                        </span>
                        {rider.plateNumber && (
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {rider.plateNumber}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          isApproved ? 'positive' : isRejected ? 'destructive' : 'warning'
                        }
                        dot
                      >
                        {isApproved ? 'Approved' : isRejected ? 'Rejected' : vStatus === 'unsubmitted' ? 'Unsubmitted' : 'Pending review'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[13px] text-muted-foreground">
                      {formatDate(rider.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isApproved && (
                          <ConfirmActionButton
                            label="Approve"
                            title="Approve rider profile?"
                            description={`Approve ${rider.firstName} ${rider.lastName}'s verification application to allow them to receive order dispatches.`}
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
                            title="Reject rider profile?"
                            description={`Reject ${rider.firstName} ${rider.lastName}'s verification application.`}
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
              {result.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No riders found for approval review.
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
            basePath="/riders/approvals"
            searchParams={params}
          />
        </div>
      </div>
    </div>
  );
}
