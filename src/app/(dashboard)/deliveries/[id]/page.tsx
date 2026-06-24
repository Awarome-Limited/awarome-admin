import Link from 'next/link';
import { notFound } from 'next/navigation';
import { authedFetch, ApiError, SingleResponse } from '@/lib/api-client';
import { AdminDelivery } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AvatarInitials } from '@/components/avatar-initials';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { formatDate, statusBadgeVariant } from '@/lib/format';
import { DELIVERY_STATUSES } from '@/lib/order-enums';
import { updateDeliveryStatus } from '../actions';

function initials(name?: string) {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0].toUpperCase())
    .slice(0, 2)
    .join('');
}

function riderName(rider: AdminDelivery['rider']) {
  if (!rider || typeof rider === 'string') return null;
  return [rider.firstName, rider.lastName].filter(Boolean).join(' ') || null;
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

  const packageFields = [
    { label: 'Fee', value: `₦${(delivery.deliveryFee ?? 0).toLocaleString()}` },
    { label: 'Distance', value: delivery.estimatedDistance ? `${delivery.estimatedDistance} km` : '—' },
    { label: 'Type', value: delivery.requestType || '—' },
    { label: 'Option', value: delivery.deliveryOption || '—' },
    {
      label: 'Paid',
      value: delivery.isPaid ? 'Yes' : 'No',
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/deliveries"
        className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-border-strong bg-card px-3 py-1.5 text-[13px] font-semibold text-foreground-secondary hover:bg-muted"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5 M12 19l-7-7 7-7"/></svg>
        Back to deliveries
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="rounded bg-chip px-2 py-0.5 font-mono text-lg font-semibold">
              {delivery.deliveryId}
            </h1>
            <Badge variant={statusBadgeVariant(delivery.status)} dot>
              {delivery.status}
            </Badge>
          </div>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            {[delivery.requestType, formatDate(delivery.createdAt)].filter(Boolean).join(' · ')}
          </p>
        </div>
        <Button size="sm" variant={riderDisplayName ? 'outline' : 'default'}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 17.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5 M18.5 17.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5 M5.5 12.5L9 6h4l2.5 4"/></svg>
          {riderDisplayName ? 'View rider' : 'Assign rider'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-4">
          {/* Route */}
          <Card>
            <CardHeader>
              <CardTitle>Route</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3.5">
                <div className="flex flex-col items-center pt-1">
                  <span className="size-[13px] shrink-0 rounded-full bg-primary" />
                  <span className="w-0.5 flex-1 bg-border" style={{ minHeight: 46 }} />
                  <span className="size-[13px] shrink-0 rounded-[3px] bg-positive" />
                </div>
                <div className="flex flex-1 flex-col gap-6">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Pickup
                    </div>
                    <div className="mt-1 text-[14px] font-semibold text-foreground">
                      {delivery.pickupAddress?.address || '—'}
                    </div>
                    {delivery.pickupAddress?.note && (
                      <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                        Note: {delivery.pickupAddress.note}
                      </div>
                    )}
                    {delivery.sender?.phone && (
                      <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                        {delivery.sender.phone}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Drop-off
                    </div>
                    <div className="mt-1 text-[14px] font-semibold text-foreground">
                      {delivery.dropoffAddress?.address || '—'}
                    </div>
                    {delivery.dropoffAddress?.note && (
                      <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                        Note: {delivery.dropoffAddress.note}
                      </div>
                    )}
                    {delivery.receiver?.phone && (
                      <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                        {delivery.receiver.phone}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Package details */}
          <Card>
            <CardHeader>
              <CardTitle>Package details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {packageFields.map((f) => (
                <div key={f.label} className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">{f.label}</span>
                  <span className="text-[14px] font-semibold tabular-nums text-foreground">
                    {f.value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col">
                {timeline.map((event, i) => (
                  <div key={event.title} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`size-[13px] shrink-0 rounded-full border-2 ${
                          event.done
                            ? 'border-primary bg-primary'
                            : 'border-border-strong bg-card'
                        }`}
                      />
                      {i < timeline.length - 1 && (
                        <span className="w-0.5 flex-1 bg-border" style={{ minHeight: 22 }} />
                      )}
                    </div>
                    <div className="-mt-0.5 pb-4.5">
                      <div
                        className={`text-[13.5px] font-semibold ${
                          event.done ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {event.title}
                      </div>
                      <div className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                        {event.date ? formatDate(event.date) : 'Pending'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-4">
          {/* Sender */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Sender
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <AvatarInitials name={delivery.sender?.name} size="default" />
                <div>
                  <div className="text-[14px] font-semibold text-foreground">
                    {delivery.sender?.name || '—'}
                  </div>
                  <div className="text-[12.5px] text-muted-foreground">Sender</div>
                </div>
              </div>
              {delivery.sender?.phone && (
                <div className="flex items-center gap-2 text-[13px] text-foreground-secondary">
                  <PhoneIcon />
                  {delivery.sender.phone}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Receiver */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Receiver
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <AvatarInitials name={delivery.receiver?.name} size="default" />
                <div>
                  <div className="text-[14px] font-semibold text-foreground">
                    {delivery.receiver?.name || '—'}
                  </div>
                  <div className="text-[12.5px] text-muted-foreground">Receiver</div>
                </div>
              </div>
              {delivery.receiver?.phone && (
                <div className="flex items-center gap-2 text-[13px] text-foreground-secondary">
                  <PhoneIcon />
                  {delivery.receiver.phone}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rider */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Rider
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rider && riderDisplayName ? (
                <div className="flex items-center gap-3">
                  <AvatarInitials name={riderDisplayName} size="default" />
                  <div>
                    <div className="text-[14px] font-semibold text-foreground">
                      {riderDisplayName}
                    </div>
                    <div className="text-[12.5px] text-muted-foreground">
                      {rider.phone || 'No phone'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-start gap-3">
                  <span className="text-[13px] text-muted-foreground">No rider assigned yet</span>
                  <Button variant="outline" size="sm" className="text-primary">
                    Assign a rider
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Override status */}
          <Card>
            <CardHeader>
              <CardTitle>Override status</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={handleStatusUpdate} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    name="status"
                    defaultValue={delivery.status}
                    className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {DELIVERY_STATUSES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="submit" className="self-start">
                  Save changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PhoneIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted-foreground">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.7 2z"/>
    </svg>
  );
}
