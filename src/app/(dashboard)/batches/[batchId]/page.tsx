import Link from 'next/link';
import { notFound } from 'next/navigation';
import { authedFetch, ApiError, PaginatedResponse, SingleResponse } from '@/lib/api-client';
import { ApiErrorCard } from '@/components/api-error-card';
import { AssignBatchDialog } from '@/components/assign-batch-dialog';
import { AvatarInitials } from '@/components/avatar-initials';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { formatDate, formatPhone, humanize, statusBadgeVariant } from '@/lib/format';
import { DetailHeader, FactList, PageStack, Panel, StatCards, SummaryRows } from '@/components/page';
import type {
  AdminBatchDetail,
  AdminBatchStop,
  AdminRider,
  BatchStopPoint,
} from '@/lib/types';
import { batchStatusLabel, batchStatusVariant, riderDisplayName } from '../batch-format';

const RIDER_LIMIT = 250;
const WAITING_FOR_COURIER = ['offered', 'unassigned'];

const naira = (value?: number) => `₦ ${(value ?? 0).toLocaleString()}`;

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
    <PageStack>
      <DetailHeader
        back={{ href: '/batches', label: 'All batches' }}
        title={<span className="tabular-nums">{batch.batchId}</span>}
        status={
          <Badge variant={batchStatusVariant(batch.status)} dot>
            {batchStatusLabel(batch.status)}
          </Badge>
        }
        meta={[
          humanize(batch.vehicleType),
          batch.assignmentMode === 'gig' ? 'Gig pool' : 'In-house',
          `${batch.window ? `${humanize(batch.window)} window` : 'No window'}${
            batch.windowDate ? ` on ${formatDate(batch.windowDate).split(',')[0]}` : ''
          }`,
          `Formed ${formatDate(batch.createdAt)}`,
        ]}
        actions={
          <>
            {mapUrl && (
              <a href={mapUrl} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'outline' })}>
                <MapIcon />
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
          </>
        }
      />

      <StatCards
        stats={[
          {
            label: 'Delivered',
            value: `${totals.delivered} of ${totals.stops}`,
            progress: totals.stops ? totals.delivered / totals.stops : 0,
          },
          { label: 'Failed or cancelled', value: totals.failed.toLocaleString() },
          { label: 'Customers paid', value: naira(totals.fare) },
          {
            label: 'Courier earns',
            value: naira(totals.payout),
            meta: `After ${batch.commissionPercent}% commission`,
          },
        ]}
      />

      <section className="grid items-start gap-4 lg:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-4">
          <Panel
            title="Courier"
            aside={
              rider && (
                <Link
                  href={`/batches?rider=${rider._id}`}
                  className="text-[13.5px] font-medium text-primary hover:text-warning"
                >
                  Their batches
                </Link>
              )
            }
          >
            {rider ? (
              <>
                <div className="flex items-center gap-3">
                  <AvatarInitials name={riderDisplayName(rider)} />
                  <div className="min-w-0">
                    <Link href={`/riders/${rider._id}`} className="font-medium hover:text-primary">
                      {riderDisplayName(rider)}
                    </Link>
                    <div className="truncate text-[12.5px] text-muted-foreground tabular-nums">
                      {[rider.phone && formatPhone(rider.phone), rider.email].filter(Boolean).join(' · ') ||
                        'No contact'}
                    </div>
                  </div>
                </div>
                <FactList
                  columns={2}
                  facts={[
                    { label: 'Fleet', value: rider.isInHouse ? 'In-house' : 'Gig' },
                    {
                      label: 'Vehicle',
                      value:
                        [rider.vehicleType && humanize(rider.vehicleType), rider.plateNumber?.toUpperCase()]
                          .filter(Boolean)
                          .join(' · ') || '—',
                    },
                    {
                      label: 'Presence',
                      value: rider.status ? (
                        <Badge variant={statusBadgeVariant(rider.status)} dot>
                          {humanize(rider.status)}
                        </Badge>
                      ) : (
                        '—'
                      ),
                    },
                    {
                      label: 'Rating',
                      value:
                        rider.rating != null
                          ? `${rider.rating.toFixed(1)} / 5${rider.ratingCount ? ` (${rider.ratingCount})` : ''}`
                          : 'No ratings yet',
                    },
                    { label: 'Trips completed', value: (rider.ordersCompleted ?? 0).toLocaleString() },
                    ...(rider.tier ? [{ label: 'Tier', value: humanize(rider.tier) }] : []),
                    { label: 'Last location', value: formatDate(rider.lastLocationAt) },
                    ...(rider.suspended
                      ? [{ label: 'Account', value: <Badge variant="destructive" dot>Suspended</Badge> }]
                      : []),
                  ]}
                />
              </>
            ) : (
              <p className="text-[13.5px] text-muted-foreground">
                {canAssign ? 'No courier has taken this batch yet.' : 'This batch never had a courier.'}
              </p>
            )}
          </Panel>

          <Panel title="Money">
            <SummaryRows
              rows={[
                { label: 'Delivery fees', value: naira(totals.fare) },
                { label: `Awarome commission (${batch.commissionPercent}%)`, value: naira(totals.commission) },
              ]}
            />
            <div className="flex items-baseline justify-between border-t border-border pt-3">
              <span className="text-[13.5px] font-medium">Courier payout</span>
              <span className="stat-value text-[24px] leading-none">{naira(totals.payout)}</span>
            </div>
          </Panel>

          <Panel title="Timeline">
            <ol className="flex flex-col">
              {timeline.map((step, i) => (
                <li key={step.title} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={
                        step.date
                          ? 'mt-1 size-2.5 shrink-0 rounded-full bg-primary'
                          : 'mt-1 size-2.5 shrink-0 rounded-full border-2 border-border-strong bg-card'
                      }
                    />
                    {i < timeline.length - 1 && <span className="w-px flex-1 bg-border" style={{ minHeight: 24 }} />}
                  </div>
                  <div className="pb-4">
                    <div className={step.date ? 'text-[14px] font-medium' : 'text-[14px] text-muted-foreground'}>
                      {step.title}
                    </div>
                    <div className="text-[12.5px] text-muted-foreground tabular-nums">
                      {step.date ? formatDate(step.date) : 'Not yet'}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>

          {batch.declinedBy && batch.declinedBy.length > 0 && (
            <Panel title={`Declined by (${batch.declinedBy.length})`}>
              <div className="flex flex-col gap-2.5 text-[14px]">
                {batch.declinedBy.map((r) => (
                  <Link key={r._id} href={`/riders/${r._id}`} className="flex items-center justify-between gap-3 hover:text-primary">
                    <span>{riderDisplayName(r)}</span>
                    <span className="text-[12.5px] text-muted-foreground tabular-nums">{r.phone ? formatPhone(r.phone) : ''}</span>
                  </Link>
                ))}
              </div>
            </Panel>
          )}

          {batch.activity.length > 0 && (
            <Panel title="Admin activity">
              <div className="flex flex-col gap-3">
                {batch.activity.map((log) => (
                  <div key={log._id} className="text-[13.5px]">
                    <div>{log.description}</div>
                    <div className="text-[12.5px] text-muted-foreground tabular-nums">
                      {staffName(log.staff)} · {formatDate(log.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>

        <Panel title={`Trips in this batch (${batch.stops.length})`}>
          {batch.stops.length === 0 && (
            <p className="text-[13.5px] text-muted-foreground">This batch has no stops left.</p>
          )}
          {batch.stops.map((stop) => (
            <StopCard key={`${stop.jobType}-${stop.jobId}`} stop={stop} />
          ))}
        </Panel>
      </section>
    </PageStack>
  );
}

function MapIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z M8 2v16 M16 6v16" />
    </svg>
  );
}

function PointBlock({ label, point, square }: { label: string; point: BatchStopPoint; square?: boolean }) {
  return (
    <div className="flex gap-2.5">
      <span
        className={
          square
            ? 'mt-1.5 size-2.5 shrink-0 rounded-[3px] bg-warning'
            : 'mt-1.5 size-2.5 shrink-0 rounded-full bg-primary'
        }
      />
      <div className="min-w-0">
        <div className="text-[11.5px] font-medium tracking-[0.06em] text-muted-foreground uppercase">
          {label}
        </div>
        <div className="text-[14px] font-medium">{point.address || '—'}</div>
        <div className="text-[12.5px] text-muted-foreground tabular-nums">
          {[point.name, point.phone && formatPhone(point.phone)].filter(Boolean).join(' · ') || '—'}
        </div>
      </div>
    </div>
  );
}

function StopCard({ stop }: { stop: AdminBatchStop }) {
  const href = stop.jobType === 'order' ? `/orders/${stop.jobId}` : `/deliveries/${stop.jobId}`;

  if (stop.missing) {
    return (
      <div className="rounded-[8px] border border-dashed border-border p-3.5 text-[13.5px] text-muted-foreground">
        Stop {stop.seq + 1}: the {stop.jobType} behind this stop ({stop.jobId}) no longer exists.
      </div>
    );
  }

  const facts = [
    { label: 'Fare', value: naira(stop.fare) },
    { label: 'Courier gets', value: naira(stop.payout) },
    { label: 'Payment', value: [stop.paymentMethod && humanize(stop.paymentMethod), stop.isPaid ? 'Paid' : 'Not paid'].filter(Boolean).join(' · ') },
    { label: 'Option', value: [stop.deliveryOption && humanize(stop.deliveryOption), stop.deliveryWindow].filter(Boolean).join(' · ') || '—' },
    ...(stop.jobType === 'order'
      ? [
          { label: 'Items', value: String(stop.itemsCount ?? 0) },
          { label: 'Goods value', value: naira(stop.productsCost) },
        ]
      : [{ label: 'Type', value: humanize(stop.requestType) }]),
    { label: 'Paid at', value: formatDate(stop.paidAt) },
    { label: 'Delivered at', value: formatDate(stop.deliveredAt) },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-[8px] border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-brand-tint text-[12px] font-semibold text-primary tabular-nums">
            {stop.seq + 1}
          </span>
          <Link href={href} className="font-medium tabular-nums hover:text-primary">
            {stop.reference || stop.jobId}
          </Link>
          <Badge variant="secondary">{humanize(stop.jobType)}</Badge>
        </div>
        <Badge variant={statusBadgeVariant(stop.status)} dot>
          {humanize(stop.status)}
        </Badge>
      </div>

      {stop.customer && (
        <div className="text-[12.5px] text-muted-foreground">
          Customer: <span className="font-medium text-foreground">{stop.customer.name || '—'}</span>
          {stop.customer.phone ? ` · ${formatPhone(stop.customer.phone)}` : ''}
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
            <span className="font-medium text-foreground tabular-nums">{fact.value}</span>
          </div>
        ))}
      </div>

      {stop.cancellation && (
        <div className="rounded-[8px] bg-negative-bg px-3 py-2 text-[13px] text-foreground">
          Cancelled: {stop.cancellation.reason || 'no reason given'}
          {stop.cancellation.note ? ` — ${stop.cancellation.note}` : ''}
        </div>
      )}
      {!stop.cancellation && stop.cancellationRequest?.status === 'pending' && (
        <div className="rounded-[8px] bg-warning-bg px-3 py-2 text-[13px] text-foreground">
          Courier asked to cancel: {stop.cancellationRequest.reason || 'no reason given'}
        </div>
      )}

      {stop.packagePhoto && (
        <a
          href={stop.packagePhoto}
          target="_blank"
          rel="noreferrer"
          className="w-fit text-[13px] font-medium text-primary hover:text-warning"
        >
          View package photo
        </a>
      )}

      {stop.events && stop.events.length > 0 && (
        <details className="text-[12.5px]">
          <summary className="cursor-pointer font-medium text-foreground-secondary">
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
