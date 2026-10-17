import Link from 'next/link';
import { notFound } from 'next/navigation';
import { authedFetch, ApiError, SingleResponse } from '@/lib/api-client';
import { AdminDelivery } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import {
  DetailHeader,
  Field,
  InlineNotice,
  PageStack,
  Panel,
  StatCards,
  SummaryRows,
} from '@/components/page';
import { AvatarInitials } from '@/components/avatar-initials';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { SubmitButton } from '@/components/submit-button';
import { CancelJobDialog } from '@/components/cancel-job-dialog';
import { formatDate, formatPhone, humanize, statusBadgeVariant } from '@/lib/format';
import { DELIVERY_STATUSES } from '@/lib/order-enums';
import { updateDeliveryStatus } from '../actions';

function riderName(rider: AdminDelivery['rider']) {
  if (!rider || typeof rider === 'string') return null;
  return [rider.firstName, rider.lastName].filter(Boolean).join(' ') || null;
}

/** The agent who cancelled it — the answer to "who did this?". */
function staffName(staff: NonNullable<AdminDelivery['cancellation']>['staff']) {
  if (!staff) return 'Awarome support';
  if (typeof staff === 'string') return 'Awarome support';
  return (
    [staff.firstName, staff.lastName].filter(Boolean).join(' ') ||
    staff.email ||
    'Awarome support'
  );
}

function buildDeliveryTimeline(delivery: AdminDelivery) {
  const status = delivery.status ?? '';
  const done = (s: string[]) => s.includes(status);
  const confirmed = done(['confirmed']);
  const active = !done(['initialized', 'pending', 'cancelled', 'failed']);

  return [
    { title: 'Delivery requested', date: delivery.createdAt, done: true, line: true },
    { title: 'Confirmed & assigned', date: undefined, done: active || confirmed, line: true },
    { title: 'Picked up', date: undefined, done: confirmed, line: true },
    { title: 'Delivered', date: undefined, done: confirmed, line: false },
  ];
}

export default async function DeliveryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let delivery: AdminDelivery;
  try {
    const result = await authedFetch<SingleResponse<AdminDelivery>>(
      `/deliveries/admin/${id}`
    );
    delivery = result.data;
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) {
      notFound();
    }
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Something went wrong.'}
      />
    );
  }

  async function handleStatusUpdate(formData: FormData) {
    'use server';
    const status = formData.get('status')?.toString();
    if (status) {
      await updateDeliveryStatus(id, status);
    }
  }

  const rider = delivery.rider && typeof delivery.rider !== 'string' ? delivery.rider : null;
  const riderDisplayName = rider ? riderName(delivery.rider) : null;
  const timeline = buildDeliveryTimeline(delivery);
  const cancellation = delivery.cancellation;
  // Nothing to cancel once it has been cancelled or handed over.
  const canCancel =
    delivery.status !== 'cancelled' &&
    delivery.status !== 'failed' &&
    delivery.riderStatus !== 'delivered';

  const cod = delivery.businessCod;
  const koboNaira = (kobo?: number) => (kobo == null ? '—' : `₦ ${(kobo / 100).toLocaleString()}`);

  return (
    <PageStack>
      <DetailHeader
        back={{ href: '/deliveries', label: 'All deliveries' }}
        title={<span className="tabular-nums">{delivery.deliveryId}</span>}
        status={
          <Badge variant={statusBadgeVariant(delivery.status)} dot>
            {humanize(delivery.status)}
          </Badge>
        }
        meta={[
          delivery.requestType && humanize(delivery.requestType),
          `Booked ${formatDate(delivery.createdAt)}`,
          delivery.bulk && typeof delivery.bulk !== 'string' && (
            <Link key="bulk" href={`/bulk-deliveries/${delivery.bulk._id}`} className="font-medium text-primary hover:text-warning">
              Part of bulk {delivery.bulk.bulkId}
            </Link>
          ),
        ]}
        actions={
          <>
            {rider ? (
              <Link href={`/riders/${rider._id}`} className={buttonVariants({ variant: 'outline' })}>
                View rider
              </Link>
            ) : (
              canCancel && (
                <Link href="/unassigned" className={buttonVariants()}>
                  Assign a rider
                </Link>
              )
            )}
            {canCancel && (
              <CancelJobDialog
                jobType="delivery"
                id={delivery._id}
                reference={delivery.deliveryId || delivery._id}
                amount={delivery.deliveryFee ?? 0}
                isPaid={delivery.isPaid === true}
                hasRider={Boolean(riderDisplayName)}
              />
            )}
          </>
        }
      />

      <StatCards
        stats={[
          { label: 'Delivery fee', value: `₦ ${(delivery.deliveryFee ?? 0).toLocaleString()}`, meta: delivery.isPaid ? 'Paid' : 'Not paid yet' },
          { label: 'Distance', value: delivery.estimatedDistance ? `${delivery.estimatedDistance} km` : '—' },
          { label: 'Speed', value: humanize(delivery.deliveryOption), meta: humanize(delivery.requestType) },
          cod
            ? { label: 'Business net', value: koboNaira(cod.netKobo), meta: `Settlement ${humanize(cod.walletStatus)}` }
            : { label: 'Rider', value: riderDisplayName || 'None yet', meta: rider?.phone ? formatPhone(rider.phone) : undefined },
        ]}
      />

      {cancellation && (
        <InlineNotice action={cancellation.refundQueued && <Link href="/refunds">Refund queued</Link>}>
          <strong className="font-semibold">Cancelled: {cancellation.reason || 'no reason given'}.</strong> By{' '}
          {staffName(cancellation.staff)}
          {cancellation.source === 'rider-request' ? ', approving the rider’s request' : ''}
          {cancellation.cancelledAt ? `, ${formatDate(cancellation.cancelledAt)}` : ''}.
          {cancellation.note && <> “{cancellation.note}”</>}
        </InlineNotice>
      )}

      <section className="grid items-start gap-4 lg:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-4">
          <Panel title="People">
            <div className="flex flex-col gap-4">
              <PartyRow label="Sender" name={delivery.sender?.name} phone={delivery.sender?.phone} />
              <PartyRow label="Receiver" name={delivery.receiver?.name} phone={delivery.receiver?.phone} />
              {rider && riderDisplayName ? (
                <PartyRow label="Rider" name={riderDisplayName} phone={rider.phone} />
              ) : (
                <div className="text-[13.5px] text-muted-foreground">No rider assigned yet.</div>
              )}
            </div>
          </Panel>

          <Panel title="Timeline">
            <ol className="flex flex-col">
              {timeline.map((event, i) => (
                <li key={event.title} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={
                        event.done
                          ? 'mt-1 size-2.5 shrink-0 rounded-full bg-primary'
                          : 'mt-1 size-2.5 shrink-0 rounded-full border-2 border-border-strong bg-card'
                      }
                    />
                    {i < timeline.length - 1 && <span className="w-px flex-1 bg-border" style={{ minHeight: 24 }} />}
                  </div>
                  <div className="pb-4">
                    <div className={event.done ? 'text-[14px] font-medium' : 'text-[14px] text-muted-foreground'}>
                      {event.title}
                    </div>
                    <div className="text-[12.5px] text-muted-foreground tabular-nums">
                      {event.date ? formatDate(event.date) : event.done ? 'Done' : 'Not yet'}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Panel title="Route">
            <div className="flex gap-3.5">
              <div className="flex flex-col items-center pt-1.5">
                <span className="size-2.5 shrink-0 rounded-full bg-primary" />
                <span className="w-px flex-1 bg-border" style={{ minHeight: 46 }} />
                <span className="size-2.5 shrink-0 rounded-[3px] bg-warning" />
              </div>
              <div className="flex flex-1 flex-col gap-6">
                <RouteStop
                  label="Pickup"
                  address={delivery.pickupAddress?.address}
                  note={delivery.pickupAddress?.note}
                  phone={delivery.sender?.phone}
                />
                <RouteStop
                  label="Drop-off"
                  address={delivery.dropoffAddress?.address}
                  note={delivery.dropoffAddress?.note}
                  phone={delivery.receiver?.phone}
                />
              </div>
            </div>
          </Panel>

          {cod && (
            <Panel
              title="Pay on delivery"
              description="Awarome Business: what the receiver pays, what comes off, and what the business is owed."
            >
              <SummaryRows
                rows={[
                  { label: 'Booking', value: cod.batchRef ? `Batch ${cod.batchRef}` : 'Single booking' },
                  { label: 'Fee mode', value: cod.feeMode === 'added' ? 'Added on top' : 'Included' },
                  { label: 'Receiver pays', value: koboNaira(cod.collectKobo) },
                  { label: 'Delivery fee', value: koboNaira(cod.deliveryFeeKobo) },
                  {
                    label: 'Paystack fee',
                    value:
                      cod.collectionFeeActualKobo != null && cod.collectionFeeActualKobo !== cod.collectionFeeKobo
                        ? `${koboNaira(cod.collectionFeeKobo)} quoted · ${koboNaira(cod.collectionFeeActualKobo)} actual`
                        : koboNaira(cod.collectionFeeKobo),
                  },
                ]}
              />
              <div className="flex items-baseline justify-between border-t border-border pt-3">
                <span className="text-[13.5px] font-medium">Business net</span>
                <span className="stat-value text-[24px] leading-none">{koboNaira(cod.netKobo)}</span>
              </div>
            </Panel>
          )}

          <Panel title="Override status" description="Manually set this delivery’s status. Every change is written to the activity log.">
            <form action={handleStatusUpdate} className="flex flex-col gap-4">
              <Field label="Status" htmlFor="status">
                <select id="status" name="status" defaultValue={delivery.status} className="field pr-9 sm:max-w-[320px]">
                  {DELIVERY_STATUSES.map((option) => (
                    <option key={option} value={option}>
                      {humanize(option)}
                    </option>
                  ))}
                </select>
              </Field>
              <SubmitButton className="self-start" />
            </form>
          </Panel>
        </div>
      </section>
    </PageStack>
  );
}

function PartyRow({ label, name, phone }: { label: string; name?: string; phone?: string }) {
  return (
    <div className="flex items-center gap-3">
      <AvatarInitials name={name || undefined} />
      <div className="min-w-0">
        <div className="text-[12.5px] text-muted-foreground">{label}</div>
        <div className={name ? 'truncate font-medium' : 'truncate font-medium text-muted-foreground'}>
          {name || 'No name yet'}
        </div>
        {phone && <div className="text-[12.5px] text-muted-foreground tabular-nums">{formatPhone(phone)}</div>}
      </div>
    </div>
  );
}

function RouteStop({ label, address, note, phone }: { label: string; address?: string; note?: string; phone?: string }) {
  return (
    <div>
      <div className="text-[11.5px] font-medium tracking-[0.06em] text-muted-foreground uppercase">{label}</div>
      <div className="mt-1 text-[14px] font-medium">{address || '—'}</div>
      {note && <div className="mt-0.5 text-[12.5px] text-muted-foreground">Note: {note}</div>}
      {phone && <div className="mt-0.5 text-[12.5px] text-muted-foreground tabular-nums">{formatPhone(phone)}</div>}
    </div>
  );
}
