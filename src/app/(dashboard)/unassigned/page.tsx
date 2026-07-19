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

  const chips = [
    { label: 'Unassigned orders', value: orders.length.toLocaleString() },
    { label: 'Package deliveries', value: deliveries.length.toLocaleString() },
    { label: 'Batches', value: batches.length.toLocaleString() },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[23px] font-bold tracking-tight text-foreground">Unassigned jobs</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Paid jobs no rider accepted within the dispatch window (30 minutes), and batches with no in-house rider for their vehicle.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {chips.map((chip) => (
          <div
            key={chip.label}
            className="flex flex-col gap-1 rounded-[12px] border border-border bg-card p-[13px_16px] shadow-[var(--shadow-card)]"
          >
            <span className="text-[12px] font-medium text-muted-foreground">{chip.label}</span>
            <span className="text-[20px] font-bold tabular-nums text-foreground">{chip.value}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <div className="text-[15px] font-semibold text-foreground">Orders ({orders.length})</div>
        <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Delivery fee</TableHead>
                  <TableHead>Since</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
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
                    <TableCell className="text-muted-foreground">
                      {typeof order.vendor === 'object'
                        ? order.vendor?.businessName || order.vendor?.name || '—'
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <span className="rounded bg-chip px-2 py-0.5 text-xs font-medium capitalize text-foreground-secondary">
                        {order.vehicleType || 'bike'}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums">₦{(order.deliveryFee ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(order.updatedAt)}</TableCell>
                    <TableCell className="text-right">
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
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="text-[15px] font-semibold text-foreground">Package deliveries ({deliveries.length})</div>
        <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Since</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
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
                    <TableCell className="max-w-64 truncate text-muted-foreground">
                      {[delivery.pickupAddress?.address, delivery.dropoffAddress?.address]
                        .filter(Boolean)
                        .join(' → ') || '—'}
                    </TableCell>
                    <TableCell>
                      <span className="rounded bg-chip px-2 py-0.5 text-xs font-medium capitalize text-foreground-secondary">
                        {delivery.vehicleType || 'bike'}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums">₦{(delivery.deliveryFee ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(delivery.updatedAt)}</TableCell>
                    <TableCell className="text-right">
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
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="text-[15px] font-semibold text-foreground">Batches ({batches.length})</div>
        <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch</TableHead>
                  <TableHead>Window</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Stops</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Since</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      No unassigned batches
                    </TableCell>
                  </TableRow>
                )}
                {batches.map((batch) => (
                  <TableRow key={batch._id}>
                    <TableCell className="font-medium">{batch.batchId}</TableCell>
                    <TableCell className="text-muted-foreground">{batch.window || '—'}</TableCell>
                    <TableCell>
                      <span className="rounded bg-chip px-2 py-0.5 text-xs font-medium capitalize text-foreground-secondary">
                        {batch.vehicleType || 'bike'}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums font-medium">{batch.stops?.length ?? 0}</TableCell>
                    <TableCell className="text-muted-foreground">{batch.assignmentMode || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(batch.updatedAt)}</TableCell>
                    <TableCell className="text-right">
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
          </div>
        </div>
      </div>
    </div>
  );
}
