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
import { formatDate, humanize } from '@/lib/format';
import { EmptyState, InlineNotice, PageHeader, PageStack } from '@/components/page';
import type {
  AdminRider,
  FormingBatchJob,
  FormingBatchStop,
  FormingCluster,
  FormingBatchesPayload,
} from '@/lib/types';
import { StatStrip } from '@/components/stat-strip';

// Enough to cover the fleet in one read; the dialog narrows by vehicle.
const RIDER_LIMIT = 250;

function partyName(user?: FormingBatchJob['user']) {
  if (!user || typeof user === 'string') return 'No name yet';
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || 'No name yet';
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
    <PageStack>
      <PageHeader
        title="Forming batches"
        subtitle="Packages grouped by area and vehicle, still collecting company. Dispatch forms these on its own at the window’s cutoff, or once a cluster fills up or ages out, so nothing here needs you. Assign one when a courier is free and you’d rather not wait."
      />

      <StatStrip stats={chips} />

      {clusters.length === 0 && (
        <section className="rounded-[10px] border border-border bg-card">
          <EmptyState title="Nothing forming" body="Batch packages show up here while they wait for company." />
        </section>
      )}

      {clusters.map((cluster) => (
        <ClusterCard key={clusterKey(cluster)} cluster={cluster} riders={riders} />
      ))}
    </PageStack>
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
    <section className="overflow-hidden rounded-[10px] border border-border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-[18px]">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[17px] leading-tight font-bold">
              {cluster.size} {cluster.size === 1 ? 'package' : 'packages'}
              {cluster.target ? ` of ${cluster.target}` : ''}
            </h3>
            <Badge variant="secondary">{humanize(cluster.vehicleType)}</Badge>
            <Badge variant="secondary">{cluster.window ?? 'No window'}</Badge>
            <Badge variant="info">{cluster.wouldFormAs === 'gig' ? 'Gig pool' : 'In-house'}</Badge>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground tabular-nums">
            <span>Waiting since {formatDate(cluster.waitingSince)}</span>
            <span>Forms on its own at {formatDate(cluster.closesAt)}</span>
          </div>
          {cluster.size > 0 && cluster.target ? (
            <div className="h-1.5 w-48 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(cluster.size / cluster.target, 1) * 100}%` }}
              />
            </div>
          ) : null}
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
        <div className="px-6 pb-4">
          <InlineNotice>{cluster.earlyWarning.message}</InlineNotice>
        </div>
      )}

      <div className="overflow-x-auto border-t border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Job</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Route</TableHead>
              <TableHead className="text-right">Fee</TableHead>
              <TableHead>Paid</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cluster.stops.map((stop) => (
              <TableRow key={stop.jobId}>
                <TableCell className="text-muted-foreground tabular-nums">{stop.seq + 1}</TableCell>
                <TableCell className="font-medium tabular-nums">{reference(stop)}</TableCell>
                <TableCell>{partyName(stop.job?.user)}</TableCell>
                <TableCell className="max-w-72 truncate text-foreground-secondary">{route(stop)}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  ₦ {(stop.job?.deliveryFee ?? 0).toLocaleString()}
                </TableCell>
                <TableCell className="whitespace-nowrap text-foreground-secondary tabular-nums">
                  {formatDate(stop.job?.paidAt ?? stop.job?.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
