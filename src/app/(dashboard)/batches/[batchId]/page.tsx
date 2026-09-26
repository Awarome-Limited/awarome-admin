import Link from 'next/link';
import { notFound } from 'next/navigation';
import { authedFetch, ApiError, PaginatedResponse, SingleResponse } from '@/lib/api-client';
import { ApiErrorCard } from '@/components/api-error-card';
import { AssignBatchDialog } from '@/components/assign-batch-dialog';
import { AvatarInitials } from '@/components/avatar-initials';
import { DetailRow } from '@/components/detail-row';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, statusBadgeVariant } from '@/lib/format';
import type {
  AdminBatchDetail,
  AdminBatchStop,
  AdminRider,
  BatchStopPoint,
} from '@/lib/types';
import { batchStatusLabel, batchStatusVariant, riderDisplayName } from '../batch-format';

const RIDER_LIMIT = 250;
const WAITING_FOR_COURIER = ['offered', 'unassigned'];

const naira = (value?: number) => `₦${(value ?? 0).toLocaleString()}`;

const hasCoords = (point: BatchStopPoint) => point.lat != null && point.long != null;

/**
 * The run as the courier drives it — each stop's pickup then its drop-off, in
 * route order. Stops without coordinates are skipped rather than guessed.
 */
function routeMapUrl(stops: AdminBatchStop[]) {
  const points = stops
    .flatMap((stop) => [stop.pickup, stop.dropoff])
    .filter(hasCoords)
    .map((point) => `${point.lat},${point.long}`);
  if (points.length < 2) return null;
  const [origin, ...rest] = points;
  const destination = rest.pop() as string;
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set('origin', origin);
  url.searchParams.set('destination', destination);
  if (rest.length) url.searchParams.set('waypoints', rest.join('|'));
  url.searchParams.set('travelmode', 'driving');
  return url.toString();
}

function staffName(staff: AdminBatchDetail['activity'][number]['staff']) {
  if (!staff || typeof staff === 'string') return 'System';
  return [staff.firstName, staff.lastName].filter(Boolean).join(' ') || staff.email || 'Staff';
}

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;

  let batch: AdminBatchDetail;
  let riders: AdminRider[] = [];
  try {
    const result = await authedFetch<SingleResponse<AdminBatchDetail>>(
      `/admins/batches/${encodeURIComponent(decodeURIComponent(batchId))}`
    );
    batch = result.data;
    if (!batch.rider && WAITING_FOR_COURIER.includes(batch.status)) {
      const fleet = await authedFetch<PaginatedResponse<AdminRider>>(
        `/riders/admin?suspended=false&limit=${RIDER_LIMIT}`
      );
      riders = fleet.data;
    }
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Something went wrong.'}
      />
    );
  }

  const rider = batch.rider;
  const { totals } = batch;
  const mapUrl = routeMapUrl(batch.stops);
  const canAssign = !rider && WAITING_FOR_COURIER.includes(batch.status);

  const timeline = [
    { title: 'Batch formed', date: batch.createdAt },
    { title: batch.assignmentMode === 'gig' ? 'Offered to gig pool' : 'Sent to in-house fleet', date: batch.dispatchedAt },
    { title: 'Courier assigned', date: batch.assignedAt },
    { title: batch.status === 'partial' ? 'Finished (some drops failed)' : 'All drops delivered', date: batch.completedAt },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/batches"
        className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-border-strong bg-card px-3 py-1.5 text-[13px] font-semibold text-foreground-secondary hover:bg-muted"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5 M12 19l-7-7 7-7"/></svg>
        Back to batches
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="rounded bg-chip px-2 py-0.5 font-mono text-lg font-semibold">
              {batch.batchId}
            </h1>
            <Badge variant={batchStatusVariant(batch.status)} dot>
              {batchStatusLabel(batch.status)}
            </Badge>
            <Badge variant="outline" className="capitalize">{batch.vehicleType}</Badge>
            <Badge variant={batch.assignmentMode === 'gig' ? 'info' : 'secondary'}>
              {batch.assignmentMode === 'gig' ? 'Gig pool' : 'In-house'}
            </Badge>
          </div>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            {totals.stops} {totals.stops === 1 ? 'drop' : 'drops'} ·{' '}
            {batch.window ? `${batch.window} window` : 'No window'}
            {batch.windowDate ? ` on ${formatDate(batch.windowDate).split(',')[0]}` : ''} · formed{' '}
            {formatDate(batch.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {mapUrl && (
            <a
              href={mapUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border-strong bg-card px-3 text-[13px] font-semibold text-foreground-secondary hover:bg-muted"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z M8 2v16 M16 6v16"/></svg>
              Open route in Maps
            </a>
          )}
          {canAssign && (
            <AssignBatchDialog
              riders={riders}
              vehicleType={batch.vehicleType}
              payload={{ batchId: batch.batchId }}
              summary={`${totals.stops} drops on a ${batch.vehicleType}. The courier gets it straight away — no broadcast, no waiting for an accept.`}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Delivered', value: `${totals.delivered} of ${totals.stops}` },
          { label: 'Failed / cancelled', value: totals.failed.toLocaleString() },
          { label: 'Customers paid', value: naira(totals.fare) },
          { label: 'Courier earns', value: naira(totals.payout) },
        ].map((chip) => (
          <div
            key={chip.label}
            className="flex flex-col gap-1 rounded-[12px] border border-border bg-card p-[13px_16px] shadow-[var(--shadow-card)]"
          >
            <span className="text-[12px] font-medium text-muted-foreground">{chip.label}</span>
            <span className="text-[20px] font-bold tabular-nums text-foreground">{chip.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Trips in this batch</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {batch.stops.length === 0 && (
                <span className="text-[13px] text-muted-foreground">
                  This batch has no stops left.
                </span>
              )}
              {batch.stops.map((stop) => (
                <StopCard key={`${stop.jobType}-${stop.jobId}`} stop={stop} />
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Courier
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rider ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <AvatarInitials name={riderDisplayName(rider)} size="default" />
                    <div className="min-w-0">
                      <Link
                        href={`/riders/${rider._id}`}
                        className="text-[14px] font-semibold text-foreground hover:underline"
                      >
                        {riderDisplayName(rider)}
                      </Link>
                      <div className="text-[12.5px] text-muted-foreground">
                        {rider.phone || 'No phone'}
                        {rider.email ? ` · ${rider.email}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 text-[13px]">
                    <DetailRow
                      label="Fleet"
                      value={rider.isInHouse ? 'In-house' : 'Gig'}
                    />
                    <DetailRow
                      label="Vehicle"
                      value={
                        <span className="capitalize">
                          {[rider.vehicleType, rider.plateNumber].filter(Boolean).join(' · ') || '—'}
                        </span>
                      }
                    />
                    <DetailRow
                      label="Status"
                      value={
                        rider.status ? (
                          <Badge variant={statusBadgeVariant(rider.status)} dot>
                            {rider.status}
                          </Badge>
                        ) : (
                          '—'
                        )
                      }
                    />
                    <DetailRow
                      label="Rating"
                      value={
                        rider.rating != null
                          ? `${rider.rating.toFixed(1)} ★${rider.ratingCount ? ` (${rider.ratingCount})` : ''}`
                          : '—'
                      }
                    />
                    <DetailRow label="Trips completed" value={rider.ordersCompleted ?? 0} />
                    {rider.tier && <DetailRow label="Tier" value={<span className="capitalize">{rider.tier}</span>} />}
                    <DetailRow label="Last location" value={formatDate(rider.lastLocationAt)} />
                    {rider.suspended && (
                      <DetailRow label="Account" value={<Badge variant="destructive">Suspended</Badge>} />
                    )}
                  </div>
                  <Link
                    href={`/batches?rider=${rider._id}`}
                    className="text-[12.5px] font-semibold text-primary hover:underline"
                  >
                    All batches by this courier →
                  </Link>
                </div>
              ) : (
                <span className="text-[13px] text-muted-foreground">
                  {canAssign
                    ? 'No courier has taken this batch yet.'
                    : 'This batch never had a courier.'}
                </span>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Money</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-[13px]">
              <DetailRow label="Delivery fees" value={naira(totals.fare)} />
              <DetailRow
                label={`Awarome commission (${batch.commissionPercent}%)`}
                value={naira(totals.commission)}
              />
              <DetailRow
                label="Courier payout"
                value={<span className="font-semibold">{naira(totals.payout)}</span>}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col gap-3">
                {timeline.map((step) => (
                  <li key={step.title} className="flex items-start gap-3">
                    <span
                      className={
                        step.date
                          ? 'mt-1 size-2.5 shrink-0 rounded-full bg-positive'
                          : 'mt-1 size-2.5 shrink-0 rounded-full border border-border-strong'
                      }
                    />
                    <div>
                      <div className={step.date ? 'text-[13px] font-semibold' : 'text-[13px] text-muted-foreground'}>
                        {step.title}
                      </div>
                      {step.date && (
                        <div className="text-[12px] text-muted-foreground">{formatDate(step.date)}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {batch.declinedBy && batch.declinedBy.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Declined by</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-[13px]">
                {batch.declinedBy.map((r) => (
                  <Link
                    key={r._id}
                    href={`/riders/${r._id}`}
                    className="flex items-center justify-between hover:underline"
                  >
                    <span>{riderDisplayName(r)}</span>
                    <span className="text-muted-foreground">{r.phone || ''}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {batch.activity.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Admin activity</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {batch.activity.map((log) => (
                  <div key={log._id} className="text-[13px]">
                    <div className="text-foreground">{log.description}</div>
                    <div className="text-[12px] text-muted-foreground">
                      {staffName(log.staff)} · {formatDate(log.createdAt)}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function PointBlock({ label, point, square }: { label: string; point: BatchStopPoint; square?: boolean }) {
  return (
    <div className="flex gap-2.5">
      <span
        className={
          square
            ? 'mt-1 size-[11px] shrink-0 rounded-[3px] bg-positive'
            : 'mt-1 size-[11px] shrink-0 rounded-full bg-primary'
        }
      />
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="text-[13.5px] font-semibold text-foreground">{point.address || '—'}</div>
        <div className="text-[12.5px] text-muted-foreground">
          {[point.name, point.phone].filter(Boolean).join(' · ') || '—'}
        </div>
      </div>
    </div>
  );
}

function StopCard({ stop }: { stop: AdminBatchStop }) {
  const href = stop.jobType === 'order' ? `/orders/${stop.jobId}` : `/deliveries/${stop.jobId}`;

  if (stop.missing) {
    return (
      <div className="rounded-[12px] border border-dashed border-border p-3 text-[13px] text-muted-foreground">
        Stop {stop.seq + 1}: the {stop.jobType} behind this stop ({stop.jobId}) no longer exists.
      </div>
    );
  }

  const facts = [
    { label: 'Fare', value: naira(stop.fare) },
    { label: 'Courier gets', value: naira(stop.payout) },
    { label: 'Payment', value: [stop.paymentMethod, stop.isPaid ? 'paid' : 'unpaid'].filter(Boolean).join(' · ') },
    { label: 'Option', value: [stop.deliveryOption, stop.deliveryWindow].filter(Boolean).join(' · ') || '—' },
    ...(stop.jobType === 'order'
      ? [
          { label: 'Items', value: String(stop.itemsCount ?? 0) },
          { label: 'Goods value', value: naira(stop.productsCost) },
        ]
      : [{ label: 'Type', value: stop.requestType || '—' }]),
    { label: 'Paid at', value: formatDate(stop.paidAt) },
    { label: 'Delivered at', value: formatDate(stop.deliveredAt) },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-[12px] border border-border p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-brand-tint text-[12px] font-bold text-primary">
            {stop.seq + 1}
          </span>
          <Link href={href} className="rounded bg-chip px-2 py-0.5 font-mono text-xs hover:underline">
            {stop.reference || stop.jobId}
          </Link>
          <span className="text-[12px] capitalize text-muted-foreground">{stop.jobType}</span>
        </div>
        <Badge variant={statusBadgeVariant(stop.status)} dot>
          {stop.status}
        </Badge>
      </div>

      {stop.customer && (
        <div className="text-[12.5px] text-muted-foreground">
          Customer: <span className="font-medium text-foreground">{stop.customer.name || '—'}</span>
          {stop.customer.phone ? ` · ${stop.customer.phone}` : ''}
          {stop.customer.email ? ` · ${stop.customer.email}` : ''}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <PointBlock label="Pickup" point={stop.pickup} />
        <PointBlock label="Drop-off" point={stop.dropoff} square />
      </div>

      {stop.note && (
        <div className="rounded-[8px] bg-muted px-2.5 py-1.5 text-[12.5px] text-foreground-secondary">
          Note: {stop.note}
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12.5px] sm:grid-cols-4">
        {facts.map((fact) => (
          <div key={fact.label} className="flex flex-col">
            <span className="text-muted-foreground">{fact.label}</span>
            <span className="font-medium capitalize text-foreground">{fact.value}</span>
          </div>
        ))}
      </div>

      {stop.cancellation && (
        <div className="rounded-[8px] border border-destructive/30 bg-destructive/5 px-2.5 py-1.5 text-[12.5px] text-foreground-secondary">
          Cancelled: {stop.cancellation.reason || 'no reason given'}
          {stop.cancellation.note ? ` — ${stop.cancellation.note}` : ''}
        </div>
      )}
      {!stop.cancellation && stop.cancellationRequest?.status === 'pending' && (
        <div className="rounded-[8px] border border-warning/35 bg-warning-bg px-2.5 py-1.5 text-[12.5px] text-foreground-secondary">
          Courier asked to cancel: {stop.cancellationRequest.reason || 'no reason given'}
        </div>
      )}

      {stop.packagePhoto && (
        <a
          href={stop.packagePhoto}
          target="_blank"
          rel="noreferrer"
          className="w-fit text-[12.5px] font-semibold text-primary hover:underline"
        >
          View package photo
        </a>
      )}

      {stop.events && stop.events.length > 0 && (
        <details className="text-[12.5px]">
          <summary className="cursor-pointer font-semibold text-foreground-secondary">
            Delivery timeline ({stop.events.length})
          </summary>
          <ol className="mt-2 flex flex-col gap-1.5 border-l border-border pl-3">
            {stop.events.map((event, i) => (
              <li key={`${event.code}-${i}`}>
                <span className="font-medium text-foreground">{event.label}</span>
                <span className="text-muted-foreground"> · {formatDate(event.at)}</span>
                {event.detail && <div className="text-muted-foreground">{event.detail}</div>}
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
