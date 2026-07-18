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
import { formatDate } from '@/lib/format';
import { redispatchBatch, redispatchJob } from './actions';

interface UnassignedParty {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

interface UnassignedOrder {
  _id: string;
  orderId?: string;
  deliveryFee?: number;
  vehicleType?: string;
  deliveryOption?: string;
  updatedAt?: string;
  user?: UnassignedParty | string;
  vendor?: { businessName?: string; name?: string; address?: string } | string;
}

interface UnassignedDelivery {
  _id: string;
  deliveryId?: string;
  deliveryFee?: number;
  vehicleType?: string;
  deliveryOption?: string;
  updatedAt?: string;
  user?: UnassignedParty | string;
  pickupAddress?: { address?: string };
  dropoffAddress?: { address?: string };
}

interface UnassignedBatch {
  _id: string;
  batchId: string;
  vehicleType?: string;
  window?: string;
  assignmentMode?: string;
  stops?: unknown[];
  updatedAt?: string;
}

interface UnassignedPayload {
  orders: UnassignedOrder[];
  deliveries: UnassignedDelivery[];
  batches: UnassignedBatch[];
}

function partyName(user?: UnassignedParty | string) {
  if (!user || typeof user === 'string') return user || '—';
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || '—';
}

export default async function UnassignedPage() {
  let payload: UnassignedPayload;
  try {
    const res = await authedFetch<SingleResponse<UnassignedPayload>>(
      '/admins/unassigned-jobs'
    );
    payload = res.data;
  } catch (error) {
    if (error instanceof ApiError) return <ApiErrorCard message={error.message} />;
    throw error;
  }

  const { orders, deliveries, batches } = payload;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Unassigned jobs</h1>
        <p className="text-sm text-muted-foreground">
          Paid jobs no rider accepted within the dispatch window (30 minutes),
          and batches with no in-house rider for their vehicle. Re-dispatching
          gives the job a fresh window and clears previous declines.
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Orders ({orders.length})</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Delivery fee</TableHead>
              <TableHead>Since</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No unassigned orders
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
                <TableCell>
                  {typeof order.vendor === 'object'
                    ? order.vendor?.businessName || order.vendor?.name || '—'
                    : '—'}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{order.vehicleType || 'bike'}</Badge>
                </TableCell>
                <TableCell>₦{(order.deliveryFee ?? 0).toLocaleString()}</TableCell>
                <TableCell>{formatDate(order.updatedAt)}</TableCell>
                <TableCell>
                  <ConfirmActionButton
                    label="Re-dispatch"
                    title="Re-dispatch this order?"
                    description="The order goes back to pending and is broadcast to nearby riders with a fresh window."
                    variant="default"
                    action={async () => {
                      'use server';
                      await redispatchJob('order', order._id);
                    }}
                  />
                </TableCell>
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
              <TableHead>Route</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Fee</TableHead>
              <TableHead>Since</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveries.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No unassigned deliveries
                </TableCell>
              </TableRow>
            )}
            {deliveries.map((delivery) => (
              <TableRow key={delivery._id}>
                <TableCell className="font-medium">
                  {delivery.deliveryId || delivery._id}
                </TableCell>
                <TableCell>{partyName(delivery.user)}</TableCell>
                <TableCell className="max-w-64 truncate">
                  {[delivery.pickupAddress?.address, delivery.dropoffAddress?.address]
                    .filter(Boolean)
                    .join(' → ') || '—'}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{delivery.vehicleType || 'bike'}</Badge>
                </TableCell>
                <TableCell>₦{(delivery.deliveryFee ?? 0).toLocaleString()}</TableCell>
                <TableCell>{formatDate(delivery.updatedAt)}</TableCell>
                <TableCell>
                  <ConfirmActionButton
                    label="Re-dispatch"
                    title="Re-dispatch this delivery?"
                    description="The delivery goes back to pending and is broadcast to nearby riders with a fresh window."
                    variant="default"
                    action={async () => {
                      'use server';
                      await redispatchJob('delivery', delivery._id);
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Batches ({batches.length})</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch</TableHead>
              <TableHead>Window</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Stops</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Since</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No unassigned batches
                </TableCell>
              </TableRow>
            )}
            {batches.map((batch) => (
              <TableRow key={batch._id}>
                <TableCell className="font-medium">{batch.batchId}</TableCell>
                <TableCell>{batch.window || '—'}</TableCell>
                <TableCell>
                  <Badge variant="outline">{batch.vehicleType || 'bike'}</Badge>
                </TableCell>
                <TableCell>{batch.stops?.length ?? 0}</TableCell>
                <TableCell>{batch.assignmentMode || '—'}</TableCell>
                <TableCell>{formatDate(batch.updatedAt)}</TableCell>
                <TableCell>
                  <ConfirmActionButton
                    label="Re-dispatch"
                    title="Re-dispatch this batch?"
                    description="The batch goes back on offer with a fresh window and cleared declines."
                    variant="default"
                    action={async () => {
                      'use server';
                      await redispatchBatch(batch.batchId);
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
