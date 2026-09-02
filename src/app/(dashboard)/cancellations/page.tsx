import Link from 'next/link';
import { authedFetch, ApiError, SingleResponse } from '@/lib/api-client';
import { ApiErrorCard } from '@/components/api-error-card';
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
import { ResolveDialog } from './_components/resolve-dialog';

interface Party {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  plateNumber?: string;
}

interface CancellationRequest {
  status?: string;
  reason?: string;
  note?: string;
  atStatus?: string;
  requestedAt?: string;
  resolvedAt?: string;
  resolutionNote?: string;
  refundQueued?: boolean;
  rider?: Party | string;
}

interface CancellableJob {
  _id: string;
  orderId?: string;
  deliveryId?: string;
  totalPrice?: number;
  deliveryFee?: number;
  isPaid?: boolean;
  batchId?: string;
  user?: Party | string;
  pickupAddress?: { address?: string };
  dropoffAddress?: { address?: string };
  deliveryLocation?: { address?: string };
  vendor?: { businessName?: string; name?: string; address?: string } | string;
  cancellationRequest?: CancellationRequest;
}

interface Payload {
  orders: CancellableJob[];
  deliveries: CancellableJob[];
  counts: { orders: number; deliveries: number };
}

const FILTERS = [
  { key: 'pending', label: 'Awaiting a decision' },
  { key: 'approved', label: 'Cancelled' },
  { key: 'declined', label: 'Declined' },
] as const;

/** Rider-facing reason codes, in the words ops uses on the phone. */
const REASONS: Record<string, string> = {
  'vehicle-breakdown': 'Vehicle broke down',
  accident: 'Had an accident',
  'customer-unreachable': 'Receiver unreachable',
  'wrong-address': 'Wrong address',
  'package-issue': 'Problem with the package',
  unsafe: 'Unsafe to continue',
  other: 'Something else',
};

const STAGES: Record<string, string> = {
  'picked-up': 'Collected',
  delivering: 'On the way',
  'arrived-dropoff': 'At the drop-off',
};

function partyName(user?: Party | string) {
  if (!user || typeof user === 'string') return user || '—';
  return (
    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
    user.email ||
    '—'
  );
}

function partyContact(user?: Party | string) {
  if (!user || typeof user === 'string') return '—';
  return user.phone || user.email || '—';
}

export default async function CancellationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const activeFilter =
    params.filter === 'approved' || params.filter === 'declined'
      ? params.filter
      : 'pending';

  let payload: Payload;
  try {
    const res = await authedFetch<SingleResponse<Payload>>(
      `/admins/cancellation-requests?status=${activeFilter}`
    );
    payload = res.data;
  } catch (error) {
    if (error instanceof ApiError) return <ApiErrorCard message={error.message} />;
    throw error;
  }

  const { orders, deliveries } = payload;
  const isPending = activeFilter === 'pending';

  const rows = [
    ...deliveries.map((job) => ({ job, jobType: 'delivery' as const })),
    ...orders.map((job) => ({ job, jobType: 'order' as const })),
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[23px] font-bold tracking-tight text-foreground">
            Cancellation requests
          </h1>
          <p className="mt-1 max-w-[70ch] text-[14px] text-muted-foreground">
            Riders who cannot finish a run they have already collected. The
            package is with them until you decide — approving ends the run for
            that customer only, and on a batch the rest of the trip carries on.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`/cancellations?filter=${f.key}`}
              className={cn(
                'rounded-[9px] border px-3.5 py-[7px] text-[13px] font-semibold transition-colors',
                activeFilter === f.key
                  ? 'border-transparent bg-brand-tint text-primary'
                  : 'border-border-strong bg-card text-foreground-secondary hover:bg-muted'
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Rider</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>{isPending ? 'Raised' : 'Resolved'}</TableHead>
                {isPending && <TableHead className="text-right">Decision</TableHead>}
                {!isPending && <TableHead>Refund</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="py-10 text-center text-muted-foreground"
                  >
                    {isPending
                      ? 'Nothing waiting — no rider is stuck with a package.'
                      : 'Nothing here yet.'}
                  </TableCell>
                </TableRow>
              )}
              {rows.map(({ job, jobType }) => {
                const request = job.cancellationRequest || {};
                const reference =
                  job.deliveryId || job.orderId || job._id.slice(-6);
                const amount =
                  jobType === 'order'
                    ? job.totalPrice ?? 0
                    : job.deliveryFee ?? 0;
                const customer = partyName(job.user);

                return (
                  <TableRow key={job._id}>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        {jobType === 'order' ? (
                          <Link
                            href={`/orders/${job._id}`}
                            className="font-medium hover:underline"
                          >
                            {reference}
                          </Link>
                        ) : (
                          <Link
                            href={`/deliveries/${job._id}`}
                            className="font-medium hover:underline"
                          >
                            {reference}
                          </Link>
                        )}
                        <span className="text-[12px] text-muted-foreground">
                          {job.batchId ? `Batch ${job.batchId}` : 'Instant'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span>{customer}</span>
                        <span className="text-[12px] text-muted-foreground">
                          {partyContact(job.user)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span>{partyName(request.rider)}</span>
                        <span className="text-[12px] text-muted-foreground">
                          {partyContact(request.rider)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-[28ch] flex-col gap-0.5">
                        <span>{REASONS[request.reason || ''] || request.reason || '—'}</span>
                        {request.note && (
                          <span className="text-[12px] text-muted-foreground">
                            “{request.note}”
                          </span>
                        )}
                        {!isPending && request.resolutionNote && (
                          <span className="text-[12px] text-muted-foreground">
                            Ops: {request.resolutionNote}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {STAGES[request.atStatus || ''] || request.atStatus || '—'}
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums">
                      ₦{amount.toLocaleString()}
                      {!job.isPaid && (
                        <span className="ml-1 text-[12px] font-normal text-muted-foreground">
                          unpaid
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(
                        isPending ? request.requestedAt : request.resolvedAt
                      )}
                    </TableCell>
                    {isPending && (
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <ResolveDialog
                            jobType={jobType}
                            id={job._id}
                            reference={reference}
                            customer={customer}
                            amount={amount}
                            isPaid={job.isPaid === true}
                            batchId={job.batchId}
                            decision="decline"
                          />
                          <ResolveDialog
                            jobType={jobType}
                            id={job._id}
                            reference={reference}
                            customer={customer}
                            amount={amount}
                            isPaid={job.isPaid === true}
                            batchId={job.batchId}
                            decision="approve"
                          />
                        </div>
                      </TableCell>
                    )}
                    {!isPending && (
                      <TableCell>
                        {request.refundQueued ? (
                          <Link href="/refunds" className="hover:underline">
                            <Badge variant="warning" dot>
                              refund queued
                            </Badge>
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
