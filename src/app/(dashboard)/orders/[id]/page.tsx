import Link from 'next/link';
import { notFound } from 'next/navigation';
import { authedFetch, ApiError, SingleResponse } from '@/lib/api-client';
import { AdminOrder } from '@/lib/types';
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
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { formatDate, statusBadgeVariant } from '@/lib/format';
import {
  ORDER_STATUSES,
  ORDER_DELIVERY_STATUSES,
  ORDER_VENDOR_STATUSES,
} from '@/lib/order-enums';
import { updateOrderStatus } from '../actions';

function partyName(party: AdminOrder['user'] | AdminOrder['vendor'] | AdminOrder['rider']) {
  if (!party || typeof party === 'string') return party || '—';
  const record = party as Record<string, string | undefined>;
  return (
    record.businessName ||
    record.name ||
    [record.firstName, record.lastName].filter(Boolean).join(' ') ||
    '—'
  );
}

function partyField(
  party: AdminOrder['user'] | AdminOrder['vendor'] | AdminOrder['rider'],
  field: 'email' | 'phone'
) {
  if (!party || typeof party === 'string') return undefined;
  return (party as Record<string, string | undefined>)[field];
}

function buildTimeline(order: AdminOrder) {
  const events: { title: string; date?: string; done: boolean }[] = [
    { title: 'Order placed', date: order.createdAt, done: true },
    {
      title: 'Accepted by vendor',
      date: order.orderAcceptanceTime,
      done: !!order.orderAcceptanceTime,
    },
    { title: 'Payment confirmed', date: order.isPaid ? order.createdAt : undefined, done: !!order.isPaid },
    {
      title: 'Out for delivery',
      done: order.orderDeliveryStatus === 'in-transit' || !!order.isDelivered,
    },
    { title: 'Delivered', done: !!order.isDelivered },
  ];
  return events;
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let order: AdminOrder;
  try {
    const result = await authedFetch<SingleResponse<AdminOrder>>(
      `/admins/orders/${id}`
    );
    order = result.data;
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
    await updateOrderStatus(id, {
      status: formData.get('status')?.toString(),
      orderDeliveryStatus: formData.get('orderDeliveryStatus')?.toString(),
      orderVendorStatus: formData.get('orderVendorStatus')?.toString(),
    });
  }

  const carts = order.carts ?? [];
  const timeline = buildTimeline(order);
  const rider = order.rider && typeof order.rider !== 'string' ? order.rider : null;

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/orders"
        className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-border-strong bg-card px-3 py-1.5 text-[13px] font-semibold text-foreground-secondary hover:bg-muted"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5 M12 19l-7-7 7-7"/></svg>
        Back to orders
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="rounded bg-chip px-2 py-0.5 font-mono text-lg font-semibold">
              {order.orderId}
            </h1>
            <Badge variant={statusBadgeVariant(order.status)} dot>
              {order.status}
            </Badge>
          </div>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            Placed {formatDate(order.createdAt)} · {partyName(order.user)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4v6h6 M20 20v-6h-6 M20 8a8 8 0 0 0-14-3 M4 16a8 8 0 0 0 14 3"/></svg>
            Refund
          </Button>
          <Button size="sm">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M9 15l2 2 4-4"/></svg>
            Print invoice
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {carts.map((item) => {
                    const productName =
                      item.product && typeof item.product !== 'string'
                        ? item.product.name
                        : undefined;
                    return (
                      <TableRow key={item._id}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <AvatarInitials name={productName} size="sm" />
                            <span className="font-medium">{productName || '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center tabular-nums">{item.quantity}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          ₦{(item.price ?? 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          ₦{((item.price ?? 0) * (item.quantity ?? 0)).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {carts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No items recorded for this order.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex flex-col gap-2 border-t px-4 py-3.5 text-sm">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Products</span>
                  <span className="tabular-nums">₦{(order.productsCost ?? 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Delivery fee</span>
                  <span className="tabular-nums">₦{(order.deliveryFee ?? 0).toLocaleString()}</span>
                </div>
                {!!order.serviceCharge && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Service charge</span>
                    <span className="tabular-nums">₦{order.serviceCharge.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center justify-between font-semibold text-primary">
                  <span>Total</span>
                  <span className="tabular-nums">₦{(order.totalPrice ?? 0).toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

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

        <div className="flex flex-col gap-4">
          {/* Customer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <AvatarInitials name={partyName(order.user)} size="default" />
                <div>
                  <div className="text-[14px] font-semibold text-foreground">{partyName(order.user)}</div>
                  <div className="text-[12.5px] text-muted-foreground">
                    {partyField(order.user, 'email') || '—'}
                  </div>
                </div>
              </div>
              {partyField(order.user, 'phone') && (
                <div className="flex items-center gap-2 text-[13px] text-foreground-secondary">
                  <PhoneIcon />
                  {partyField(order.user, 'phone')}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vendor */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Vendor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex size-[38px] shrink-0 items-center justify-center rounded-[9px] bg-brand-tint text-[12px] font-bold text-primary">
                  {initials(partyName(order.vendor))}
                </div>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-semibold text-foreground">
                    {partyName(order.vendor)}
                  </div>
                  <div className="text-[12.5px] text-muted-foreground">Vendor store</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rider — only show if assigned */}
          {order.rider && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Rider
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <AvatarInitials name={partyName(order.rider)} size="default" />
                  <div>
                    <div className="text-[14px] font-semibold text-foreground">
                      {partyName(order.rider)}
                    </div>
                    <div className="text-[12.5px] text-muted-foreground">Rider</div>
                  </div>
                </div>
                {rider?.phone && (
                  <div className="flex items-center gap-2 text-[13px] text-foreground-secondary">
                    <PhoneIcon />
                    {rider.phone}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payment info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Method</span>
                <span className="font-medium">{order.paymentMethod || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Paid</span>
                <Badge variant={order.isPaid ? 'positive' : 'outline'} dot>
                  {order.isPaid ? 'Yes' : 'No'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {order.deliveryLocation?.address && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Delivery address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2.5 text-[13.5px] text-foreground">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-primary">
                    <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6"/>
                  </svg>
                  {order.deliveryLocation.address}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Override status */}
          <Card>
            <CardHeader>
              <CardTitle>Override status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-[12.5px] text-muted-foreground">
                Manually update this order. Written to activity log.
              </p>
              <form
                key={`${order.status}-${order.orderDeliveryStatus}-${order.orderVendorStatus}`}
                action={handleStatusUpdate}
                className="flex flex-col gap-4"
              >
                <StatusField
                  label="Order status"
                  name="status"
                  options={ORDER_STATUSES}
                  defaultValue={order.status}
                />
                <StatusField
                  label="Delivery status"
                  name="orderDeliveryStatus"
                  options={ORDER_DELIVERY_STATUSES}
                  defaultValue={order.orderDeliveryStatus}
                />
                <StatusField
                  label="Vendor status"
                  name="orderVendorStatus"
                  options={ORDER_VENDOR_STATUSES}
                  defaultValue={order.orderVendorStatus}
                />
                <Button type="submit" className="w-full">
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

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0].toUpperCase())
    .slice(0, 2)
    .join('');
}

function PhoneIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted-foreground">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.7 2z"/>
    </svg>
  );
}

function StatusField({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: readonly string[];
  defaultValue?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
