import Link from 'next/link';
import { authedFetch, ApiError, SingleResponse } from '@/lib/api-client';
import { ApiErrorCard } from '@/components/api-error-card';
import { ConfirmActionButton } from '@/components/confirm-action-button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { formatDate, formatPhone, humanize, statusBadgeVariant } from '@/lib/format';
import { StatStrip } from '@/components/stat-strip';
import { SegmentedLinks } from '@/components/segmented';
import { EmptyRow, InlineNotice, ListCard, PageHeader, PageStack } from '@/components/page';
import { markRefunded } from './actions';

interface RefundParty {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

interface RefundOrder {
  _id: string;
  orderId?: string;
  totalPrice?: number;
  status?: string;
  refundStatus?: string;
  refundedAt?: string;
  updatedAt?: string;
  user?: RefundParty | string;
  vendor?: { businessName?: string; name?: string } | string;
}

interface RefundDelivery {
  _id: string;
  deliveryId?: string;
  deliveryFee?: number;
  status?: string;
  refundStatus?: string;
  refundedAt?: string;
  updatedAt?: string;
  user?: RefundParty | string;
}

interface RefundsPayload {
  orders: RefundOrder[];
  deliveries: RefundDelivery[];
  counts: { orders: number; deliveries: number };
}

const FILTERS = [
  { key: 'pending', label: 'Awaiting refund' },
  { key: 'refunded', label: 'Refunded' },
] as const;

function partyName(user?: RefundParty | string) {
  if (!user || typeof user === 'string') return user || '—';
  return (
    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
    user.email ||
    '—'
  );
}

function partyContact(user?: RefundParty | string) {
  if (!user || typeof user === 'string') return '—';
  return user.phone ? formatPhone(user.phone) : user.email || '—';
}

export default async function RefundsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const activeFilter = params.filter === 'refunded' ? 'refunded' : 'pending';

  let payload: RefundsPayload;
  try {
    const res = await authedFetch<SingleResponse<RefundsPayload>>(
      `/admins/refunds?status=${activeFilter}`
    );
    payload = res.data;
  } catch (error) {
    if (error instanceof ApiError) return <ApiErrorCard message={error.message} />;
    throw error;
  }

  const { orders, deliveries } = payload;
  const isPending = activeFilter === 'pending';

  const owed =
    orders.reduce((sum, o) => sum + (o.totalPrice ?? 0), 0) +
    deliveries.reduce((sum, d) => sum + (d.deliveryFee ?? 0), 0);
  const tabs = (
    <SegmentedLinks
      active={activeFilter}
      items={FILTERS.map((f) => ({ key: f.key, label: f.label, href: `/refunds?filter=${f.key}` }))}
    />
  );
  const person = (user?: RefundParty | string) => (
    <>
      <div>{partyName(user)}</div>
      <div className="text-[12.5px] text-muted-foreground tabular-nums">{partyContact(user)}</div>
    </>
  );

  return (
    <PageStack>
      <PageHeader
        title="Refunds"
        subtitle="Paid orders and package deliveries that were cancelled and owe the customer money."
        actions={tabs}
      />

      <StatStrip
        stats={[
          { label: isPending ? 'Owed to customers' : 'Refunded', value: `₦ ${owed.toLocaleString()}` },
          { label: 'Orders', value: orders.length.toLocaleString() },
          { label: 'Package deliveries', value: deliveries.length.toLocaleString() },
        ]}
      />

      {isPending && orders.length + deliveries.length > 0 && (
        <InlineNotice>
          {orders.length + deliveries.length === 1 ? '1 customer is' : `${orders.length + deliveries.length} customers are`}{' '}
          waiting for ₦ {owed.toLocaleString()} back. Send it, then mark each one refunded.
        </InlineNotice>
      )}

      <ListCard title={`Orders (${orders.length})`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Store</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              {isPending && <TableHead className="text-right">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 && (
              <EmptyRow
                colSpan={isPending ? 6 : 5}
                title={isPending ? 'No orders to refund' : 'No refunded orders'}
              />
            )}
            {orders.map((order) => (
              <TableRow key={order._id}>
                <TableCell className="tabular-nums">
                  <Link href={`/orders/${order._id}`} className="font-medium hover:text-primary">
                    {order.orderId || order._id}
                  </Link>
                  <div className="text-[12.5px] whitespace-nowrap text-muted-foreground">
                    {isPending ? 'Cancelled' : 'Refunded'} {formatDate(isPending ? order.updatedAt : order.refundedAt)}
                  </div>
                </TableCell>
                <TableCell>{person(order.user)}</TableCell>
                <TableCell className="text-foreground-secondary">
                  {typeof order.vendor === 'object' ? order.vendor?.businessName || order.vendor?.name || '—' : '—'}
                </TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant(order.refundStatus)} dot>
                    {humanize(order.refundStatus)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  ₦ {(order.totalPrice ?? 0).toLocaleString()}
                </TableCell>
                {isPending && (
                  <TableCell className="text-right">
                    <ConfirmActionButton
                      label="Mark refunded"
                      title="Mark this order refunded?"
                      description={`Confirms ₦ ${(order.totalPrice ?? 0).toLocaleString()} has been returned to ${partyName(order.user)}. This cannot be undone.`}
                      variant="default"
                      action={async () => {
                        'use server';
                        await markRefunded('order', order._id);
                      }}
                    />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ListCard>

      <ListCard title={`Package deliveries (${deliveries.length})`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Delivery</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              {isPending && <TableHead className="text-right">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveries.length === 0 && (
              <EmptyRow
                colSpan={isPending ? 5 : 4}
                title={isPending ? 'No deliveries to refund' : 'No refunded deliveries'}
              />
            )}
            {deliveries.map((delivery) => (
              <TableRow key={delivery._id}>
                <TableCell className="tabular-nums">
                  <Link href={`/deliveries/${delivery._id}`} className="font-medium hover:text-primary">
                    {delivery.deliveryId || delivery._id}
                  </Link>
                  <div className="text-[12.5px] whitespace-nowrap text-muted-foreground">
                    {isPending ? 'Cancelled' : 'Refunded'}{' '}
                    {formatDate(isPending ? delivery.updatedAt : delivery.refundedAt)}
                  </div>
                </TableCell>
                <TableCell>{person(delivery.user)}</TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant(delivery.refundStatus)} dot>
                    {humanize(delivery.refundStatus)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  ₦ {(delivery.deliveryFee ?? 0).toLocaleString()}
                </TableCell>
                {isPending && (
                  <TableCell className="text-right">
                    <ConfirmActionButton
                      label="Mark refunded"
                      title="Mark this delivery refunded?"
                      description={`Confirms ₦ ${(delivery.deliveryFee ?? 0).toLocaleString()} has been returned to ${partyName(delivery.user)}. This cannot be undone.`}
                      variant="default"
                      action={async () => {
                        'use server';
                        await markRefunded('delivery', delivery._id);
                      }}
                    />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ListCard>
    </PageStack>
  );
}
