import Link from 'next/link';
import {
  authedFetch,
  ApiError,
  PaginatedResponse,
  SingleResponse,
} from '@/lib/api-client';
import { ApiErrorCard } from '@/components/api-error-card';
import { AssignBatchDialog } from '@/components/assign-batch-dialog';
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
import { formatDate, humanize } from '@/lib/format';
import { EmptyRow, InlineNotice, ListCard, PageHeader, PageStack } from '@/components/page';
import type { AdminRider } from '@/lib/types';
import { redispatchBatch, redispatchJob } from './actions';
import { StatStrip } from '@/components/stat-strip';

// Enough to cover the fleet in one read; the assign dialog narrows by vehicle.
const RIDER_LIMIT = 250;

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
  if (!user || typeof user === 'string') return user || 'No name yet';
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || 'No name yet';
}

export default async function UnassignedPage() {
  let payload: UnassignedPayload;
  let riders: AdminRider[] = [];
  try {
    const [res, fleet] = await Promise.all([
      authedFetch<SingleResponse<UnassignedPayload>>('/admins/unassigned-jobs'),
      authedFetch<PaginatedResponse<AdminRider>>(
        `/riders/admin?suspended=false&limit=${RIDER_LIMIT}`
      ),
    ]);
    payload = res.data;
    riders = fleet.data;
  } catch (error) {
    if (error instanceof ApiError) return <ApiErrorCard message={error.message} />;
    throw error;
  }

  const { orders, deliveries, batches } = payload;

  const total = orders.length + deliveries.length + batches.length;
  const chips = [
    { label: 'Waiting for a rider', value: total.toLocaleString() },
    { label: 'Orders', value: orders.length.toLocaleString() },
    { label: 'Package deliveries', value: deliveries.length.toLocaleString() },
    { label: 'Batches', value: batches.length.toLocaleString() },
  ];
  const vehicle = (v?: string) => <Badge variant="secondary">{humanize(v || 'bike')}</Badge>;
  const since = (d?: string) => (
    <TableCell className="whitespace-nowrap text-foreground-secondary tabular-nums">{formatDate(d)}</TableCell>
  );

  return (
    <PageStack>
      <PageHeader
        title="Unassigned"
        subtitle="Paid jobs no rider accepted within the 30-minute dispatch window, and batches with no in-house rider for their vehicle. Put them back on offer, or hand a batch straight to a courier."
      />

      <StatStrip stats={chips} />

      {total > 0 && (
        <InlineNotice>
          {total === 1 ? '1 paid job is' : `${total} paid jobs are`} waiting for a rider. Customers see these as
          “finding a rider” until you act.
        </InlineNotice>
      )}

      <ListCard title={`Orders (${orders.length})`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Store</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead className="text-right">Delivery fee</TableHead>
              <TableHead>Waiting since</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 && (
              <EmptyRow colSpan={7} title="No orders waiting" body="Every paid order has a rider." />
            )}
            {orders.map((order) => (
              <TableRow key={order._id}>
                <TableCell>
                  <Link href={`/orders/${order._id}`} className="font-medium tabular-nums hover:text-primary">
                    {order.orderId || order._id}
                  </Link>
                </TableCell>
                <TableCell>{partyName(order.user)}</TableCell>
                <TableCell className="text-foreground-secondary">
                  {typeof order.vendor === 'object' ? order.vendor?.businessName || order.vendor?.name || '—' : '—'}
                </TableCell>
                <TableCell>{vehicle(order.vehicleType)}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  ₦ {(order.deliveryFee ?? 0).toLocaleString()}
                </TableCell>
                {since(order.updatedAt)}
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
      </ListCard>

      <ListCard title={`Package deliveries (${deliveries.length})`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Delivery</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead className="text-right">Fee</TableHead>
              <TableHead>Waiting since</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveries.length === 0 && (
              <EmptyRow colSpan={7} title="No deliveries waiting" body="Every paid delivery has a rider." />
            )}
            {deliveries.map((delivery) => (
              <TableRow key={delivery._id}>
                <TableCell>
                  <Link href={`/deliveries/${delivery._id}`} className="font-medium tabular-nums hover:text-primary">
                    {delivery.deliveryId || delivery._id}
                  </Link>
                </TableCell>
                <TableCell>{partyName(delivery.user)}</TableCell>
                <TableCell className="max-w-[260px]">
                  <div className="truncate text-foreground-secondary">{delivery.pickupAddress?.address || '—'}</div>
                  <div className="truncate text-[12.5px] text-muted-foreground">
                    to {delivery.dropoffAddress?.address || '—'}
                  </div>
                </TableCell>
                <TableCell>{vehicle(delivery.vehicleType)}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  ₦ {(delivery.deliveryFee ?? 0).toLocaleString()}
                </TableCell>
                {since(delivery.updatedAt)}
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
      </ListCard>

      <ListCard title={`Batches (${batches.length})`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch</TableHead>
              <TableHead>Window</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead className="text-right">Stops</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Waiting since</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.length === 0 && (
              <EmptyRow colSpan={7} title="No batches waiting" body="Every batch has a rider." />
            )}
            {batches.map((batch) => (
              <TableRow key={batch._id}>
                <TableCell>
                  <Link href={`/batches/${batch.batchId}`} className="font-medium tabular-nums hover:text-primary">
                    {batch.batchId}
                  </Link>
                </TableCell>
                <TableCell className="text-foreground-secondary">{batch.window || '—'}</TableCell>
                <TableCell>{vehicle(batch.vehicleType)}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{batch.stops?.length ?? 0}</TableCell>
                <TableCell className="text-foreground-secondary">{humanize(batch.assignmentMode)}</TableCell>
                {since(batch.updatedAt)}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <AssignBatchDialog
                      riders={riders}
                      vehicleType={batch.vehicleType || 'bike'}
                      payload={{ batchId: batch.batchId }}
                      summary={`${batch.stops?.length ?? 0} drops on a ${
                        batch.vehicleType || 'bike'
                      }. The courier gets it straight away — no broadcast, no waiting for an accept.`}
                    />
                    <ConfirmActionButton
                      label="Re-dispatch"
                      title="Re-dispatch this batch?"
                      description="The batch goes back on offer with a fresh window and cleared declines."
                      variant="outline"
                      action={async () => {
                        'use server';
                        await redispatchBatch(batch.batchId);
                      }}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ListCard>
    </PageStack>
  );
}
