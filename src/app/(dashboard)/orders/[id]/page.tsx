import Link from 'next/link';
import { notFound } from 'next/navigation';
import { authedFetch, ApiError, SingleResponse } from '@/lib/api-client';
import { AdminOrder } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import {
  DetailHeader,
  EmptyRow,
  Field,
  FieldGrid,
  InlineNotice,
  PageStack,
  Panel,
  StatCards,
  SummaryRows,
} from '@/components/page';
import { AvatarInitials } from '@/components/avatar-initials';
import { Badge } from '@/components/ui/badge';
import { SubmitButton } from '@/components/submit-button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { CancelJobDialog } from '@/components/cancel-job-dialog';
import { formatDate, formatPhone, humanize, statusBadgeVariant } from '@/lib/format';
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

/** The agent who cancelled it — the answer to "who did this?". */
function cancellingStaff(
  staff: NonNullable<AdminOrder['cancellation']>['staff']
) {
  if (!staff || typeof staff === 'string') return 'Awarome support';
  return (
    [staff.firstName, staff.lastName].filter(Boolean).join(' ') ||
    staff.email ||
    'Awarome support'
  );
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

  const customer = partyName(order.user);
  const vendorLabel = partyName(order.vendor);

  return (
    <PageStack>
      <DetailHeader
        back={{ href: '/orders', label: 'All orders' }}
        title={<span className="tabular-nums">{order.orderId}</span>}
        status={
          <Badge variant={statusBadgeVariant(order.status)} dot>
            {humanize(order.status)}
          </Badge>
        }
        meta={[
          <Badge key="stage" variant={statusBadgeVariant(order.orderDeliveryStatus)} dot>
            {humanize(order.orderDeliveryStatus)}
          </Badge>,
          `Placed ${formatDate(order.createdAt)}`,
          customer,
        ]}
        actions={
          order.status !== 'cancelled' &&
          !order.isDelivered && (
            <CancelJobDialog
              jobType="order"
              id={order._id}
              reference={order.orderId || order._id}
              amount={order.totalPrice ?? 0}
              isPaid={order.isPaid === true}
              hasRider={Boolean(order.rider)}
            />
          )
        }
      />

      <StatCards
        stats={[
          { label: 'Total', value: `₦ ${(order.totalPrice ?? 0).toLocaleString()}`, meta: order.isPaid ? 'Paid' : 'Not paid yet' },
          { label: 'Products', value: `₦ ${(order.productsCost ?? 0).toLocaleString()}`, meta: `${carts.length} ${carts.length === 1 ? 'item' : 'items'}` },
          { label: 'Delivery fee', value: `₦ ${(order.deliveryFee ?? 0).toLocaleString()}` },
          { label: 'Payment method', value: humanize(order.paymentMethod), meta: order.isPaid ? 'Money received' : 'Waiting for payment' },
        ]}
      />

      {order.cancellation && (
        <InlineNotice
          action={order.cancellation.refundQueued && <Link href="/refunds">Refund queued</Link>}
        >
          <strong className="font-semibold">Cancelled: {order.cancellation.reason || 'no reason given'}.</strong>{' '}
          By {cancellingStaff(order.cancellation.staff)}
          {order.cancellation.source === 'rider-request' ? ', approving the rider’s request' : ''}
          {order.cancellation.cancelledAt ? `, ${formatDate(order.cancellation.cancelledAt)}` : ''}.
          {order.cancellation.note && <> “{order.cancellation.note}”</>}
        </InlineNotice>
      )}

      <section className="grid items-start gap-4 lg:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-4">
          <Panel title="People">
            <div className="flex flex-col gap-4">
              <PartyRow
                label="Customer"
                name={customer}
                detail={[partyField(order.user, 'email'), partyField(order.user, 'phone') && formatPhone(partyField(order.user, 'phone'))]
                  .filter(Boolean)
                  .join(' · ')}
              />
              <PartyRow label="Store" name={vendorLabel} store />
              {order.rider && (
                <PartyRow label="Rider" name={partyName(order.rider)} detail={rider?.phone ? formatPhone(rider.phone) : undefined} />
              )}
            </div>
          </Panel>

          {order.deliveryLocation?.address && (
            <Panel title="Delivery address">
              <p className="text-[14px]">{order.deliveryLocation.address}</p>
            </Panel>
          )}

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
          <Panel flush title="Items">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {carts.map((item) => {
                    const productName =
                      item.product && typeof item.product !== 'string' ? item.product.name : undefined;
                    return (
                      <TableRow key={item._id}>
                        <TableCell className="font-medium">{productName || 'Unknown product'}</TableCell>
                        <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                        <TableCell className="text-right text-foreground-secondary tabular-nums">
                          ₦ {(item.price ?? 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          ₦ {((item.price ?? 0) * (item.quantity ?? 0)).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {carts.length === 0 && (
                    <EmptyRow colSpan={4} title="No items recorded" body="This order has no cart lines saved." />
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="border-t border-border px-6 py-4">
              <SummaryRows
                rows={[
                  { label: 'Products', value: `₦ ${(order.productsCost ?? 0).toLocaleString()}` },
                  { label: 'Delivery fee', value: `₦ ${(order.deliveryFee ?? 0).toLocaleString()}` },
                  ...(order.serviceCharge
                    ? [{ label: 'Service charge', value: `₦ ${order.serviceCharge.toLocaleString()}` }]
                    : []),
                ]}
              />
              <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
                <span className="text-[13.5px] font-medium">Customer pays</span>
                <span className="stat-value text-[24px] leading-none">₦ {(order.totalPrice ?? 0).toLocaleString()}</span>
              </div>
            </div>
          </Panel>

          <Panel title="Override status" description="Manually set this order’s status. Every change is written to the activity log.">
            <form
              key={`${order.status}-${order.orderDeliveryStatus}-${order.orderVendorStatus}`}
              action={handleStatusUpdate}
              className="flex flex-col gap-4"
            >
              <FieldGrid>
                <StatusField label="Payment" name="status" options={ORDER_STATUSES} defaultValue={order.status} />
                <StatusField
                  label="Delivery stage"
                  name="orderDeliveryStatus"
                  options={ORDER_DELIVERY_STATUSES}
                  defaultValue={order.orderDeliveryStatus}
                />
                <StatusField
                  label="Store status"
                  name="orderVendorStatus"
                  options={ORDER_VENDOR_STATUSES}
                  defaultValue={order.orderVendorStatus}
                />
              </FieldGrid>
              <SubmitButton className="self-start" />
            </form>
          </Panel>
        </div>
      </section>
    </PageStack>
  );
}

function PartyRow({ label, name, detail, store }: { label: string; name: string; detail?: string; store?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <AvatarInitials name={name === '—' ? undefined : name} shape={store ? 'store' : 'person'} />
      <div className="min-w-0">
        <div className="text-[12.5px] text-muted-foreground">{label}</div>
        <div className="truncate font-medium">{name === '—' ? 'No name yet' : name}</div>
        {detail && <div className="truncate text-[12.5px] text-muted-foreground tabular-nums">{detail}</div>}
      </div>
    </div>
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
    <Field label={label} htmlFor={name}>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="field pr-9"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {humanize(option)}
          </option>
        ))}
      </select>
    </Field>
  );
}
