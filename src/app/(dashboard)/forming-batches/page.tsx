import { authedFetch, ApiError, PaginatedResponse, SingleResponse } from '@/lib/api-client';
import { ApiErrorCard } from '@/components/api-error-card';
import { AssignBatchDialog } from '@/components/assign-batch-dialog';
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
import type {
  AdminRider,
  FormingBatchJob,
  FormingBatchStop,
  FormingCluster,
  FormingBatchesPayload,
} from '@/lib/types';

// Enough to cover the fleet in one read; the dialog narrows by vehicle.
const RIDER_LIMIT = 250;

function partyName(user?: FormingBatchJob['user']) {
  if (!user || typeof user === 'string') return '—';
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || '—';
}

function route(stop: FormingBatchStop) {
  const job = stop.job;
  if (!job) return '—';
  const pickup =
    stop.jobType === 'order'
      ? typeof job.vendor === 'object'
        ? job.vendor?.businessName || job.vendor?.name || job.vendor?.address
        : undefined
      : job.pickupAddress?.address;
  const dropoff =
    stop.jobType === 'order'
      ? job.deliveryLocation?.address
      : job.dropoffAddress?.address;
  return [pickup, dropoff].filter(Boolean).join(' → ') || '—';
}

function reference(stop: FormingBatchStop) {
  return stop.job?.orderId || stop.job?.deliveryId || stop.jobId;
}

function clusterKey(cluster: FormingCluster) {
  return `${cluster.window ?? 'open'}-${cluster.vehicleType}-${cluster.stops
    .map((stop) => stop.jobId)
    .join('-')}`;
}

export default async function FormingBatchesPage() {
  let payload: FormingBatchesPayload;
  let riders: AdminRider[] = [];

  try {
    const [batches, fleet] = await Promise.all([
      authedFetch<SingleResponse<FormingBatchesPayload>>('/admins/forming-batches'),
      authedFetch<PaginatedResponse<AdminRider>>(
        `/riders/admin?suspended=false&limit=${RIDER_LIMIT}`
      ),
    ]);
    payload = batches.data;
    riders = fleet.data;
  } catch (error) {
    if (error instanceof ApiError) return <ApiErrorCard message={error.message} />;
    throw error;
  }

  const { clusters, counts } = payload;
  const early = clusters.filter((cluster) => cluster.earlyWarning).length;

  const chips = [
    { label: 'Clusters waiting', value: counts.clusters.toLocaleString() },
    { label: 'Packages in them', value: counts.stops.toLocaleString() },
    { label: 'Ahead of their window', value: early.toLocaleString() },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[23px] font-bold tracking-tight text-foreground">Forming batches</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Packages grouped by area and vehicle, still collecting company. Dispatch forms
          these on its own — at the window&apos;s cutoff, or once a cluster fills up or ages
          out — so nothing here needs you. Assign one when a courier is free and you would
          rather not wait.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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

      {clusters.length === 0 && (
        <div className="rounded-[14px] border border-border bg-card p-10 text-center text-muted-foreground shadow-[var(--shadow-card)]">
          Nothing is waiting to be batched right now.
        </div>
      )}

      {clusters.map((cluster) => (
        <ClusterCard key={clusterKey(cluster)} cluster={cluster} riders={riders} />
      ))}
    </div>
  );
}

function ClusterCard({
  cluster,
  riders,
}: {
  cluster: FormingCluster;
  riders: AdminRider[];
}) {
  const summary = `${cluster.size} ${
    cluster.size === 1 ? 'package' : 'packages'
  } on a ${cluster.vehicleType}${
    cluster.window ? `, booked for ${cluster.window}` : ''
  }. The batch is formed the moment you assign it.`;

  return (
    <div className="flex flex-col gap-4 rounded-[14px] border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold text-foreground">
              {cluster.size} {cluster.size === 1 ? 'package' : 'packages'}
              {cluster.target ? ` of ${cluster.target}` : ''}
            </span>
            <span className="rounded bg-chip px-2 py-0.5 text-xs font-medium capitalize text-foreground-secondary">
              {cluster.vehicleType}
            </span>
            <Badge variant="outline">{cluster.window ?? 'No window'}</Badge>
            <Badge variant={cluster.wouldFormAs === 'gig' ? 'info' : 'secondary'}>
              {cluster.wouldFormAs === 'gig'
                ? 'Would go to the gig pool'
                : 'Would go in-house'}
            </Badge>
            {cluster.earlyWarning && (
              <Badge variant="warning">Ahead of its window</Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-[12.5px] text-muted-foreground">
            <span>Waiting since {formatDate(cluster.waitingSince)}</span>
            <span>Forms on its own at {formatDate(cluster.closesAt)}</span>
          </div>
        </div>

        <AssignBatchDialog
          riders={riders}
          vehicleType={cluster.vehicleType}
          payload={{
            jobs: cluster.stops.map((stop) => ({
              jobType: stop.jobType,
              id: stop.jobId,
            })),
          }}
          summary={summary}
          warning={cluster.earlyWarning?.message}
          label="Assign now"
        />
      </div>

      {cluster.earlyWarning && (
        <div className="rounded-[10px] border border-warning/35 bg-warning-bg px-3 py-2 text-[12.5px] text-foreground-secondary">
          {cluster.earlyWarning.message}
        </div>
      )}

      <div className="overflow-hidden rounded-[10px] border border-border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cluster.stops.map((stop) => (
                <TableRow key={stop.jobId}>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {stop.seq + 1}
                  </TableCell>
                  <TableCell className="font-medium">{reference(stop)}</TableCell>
                  <TableCell>{partyName(stop.job?.user)}</TableCell>
                  <TableCell className="max-w-72 truncate text-muted-foreground">
                    {route(stop)}
                  </TableCell>
                  <TableCell className="font-semibold tabular-nums">
                    ₦{(stop.job?.deliveryFee ?? 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(stop.job?.paidAt ?? stop.job?.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
