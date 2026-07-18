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
import { formatDate, statusBadgeVariant } from '@/lib/format';
import { cn } from '@/lib/utils';
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
  return user.phone || user.email || '—';
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Refunds</h1>
          <p className="text-sm text-muted-foreground">
            Paid orders and package deliveries that were cancelled and owe the
            customer money. Mark one refunded once the money has been returned —
            refunded jobs never re-enter the delivery pool.
          </p>
        </div>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`/refunds?filter=${f.key}`}
              className={cn(
                'rounded-full border px-3 py-1 text-sm',
                activeFilter === f.key
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Orders ({orders.length})</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>{isPending ? 'Cancelled' : 'Refunded'}</TableHead>
              {isPending && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No {isPending ? 'pending refunds' : 'refunded orders'}
                </TableCell>
              </TableRow>
            )}
            {orders.map((order) => (
              <TableRow key={order._id}>
                <TableCell>
                  <Link href={`/orders/${order._id}`} className="font-medium hover:underline">
                    {order.orderId || order._id}
                  </Link>
                </TableCell>
                <TableCell>{partyName(order.user)}</TableCell>
                <TableCell>{partyContact(order.user)}</TableCell>
                <TableCell>
                  {typeof order.vendor === 'object'
                    ? order.vendor?.businessName || order.vendor?.name || '—'
                    : '—'}
                </TableCell>
                <TableCell>₦{(order.totalPrice ?? 0).toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant(order.refundStatus)}>
                    {order.refundStatus}
                  </Badge>
                </TableCell>
                <TableCell>
                  {formatDate(isPending ? order.updatedAt : order.refundedAt)}
                </TableCell>
                {isPending && (
                  <TableCell>
                    <ConfirmActionButton
                      label="Mark refunded"
                      title="Mark this order refunded?"
                      description={`Confirms ₦${(order.totalPrice ?? 0).toLocaleString()} has been returned to ${partyName(order.user)}. This cannot be undone.`}
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
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Package deliveries ({deliveries.length})</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Delivery</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>{isPending ? 'Cancelled' : 'Refunded'}</TableHead>
              {isPending && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveries.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No {isPending ? 'pending refunds' : 'refunded deliveries'}
                </TableCell>
              </TableRow>
            )}
            {deliveries.map((delivery) => (
              <TableRow key={delivery._id}>
                <TableCell className="font-medium">
                  {delivery.deliveryId || delivery._id}
                </TableCell>
                <TableCell>{partyName(delivery.user)}</TableCell>
                <TableCell>{partyContact(delivery.user)}</TableCell>
                <TableCell>₦{(delivery.deliveryFee ?? 0).toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant(delivery.refundStatus)}>
                    {delivery.refundStatus}
                  </Badge>
                </TableCell>
                <TableCell>
                  {formatDate(isPending ? delivery.updatedAt : delivery.refundedAt)}
                </TableCell>
                {isPending && (
                  <TableCell>
                    <ConfirmActionButton
                      label="Mark refunded"
                      title="Mark this delivery refunded?"
                      description={`Confirms ₦${(delivery.deliveryFee ?? 0).toLocaleString()} has been returned to ${partyName(delivery.user)}. This cannot be undone.`}
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
      </section>
    </div>
  );
}
