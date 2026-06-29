import { notFound } from 'next/navigation';
import { authedFetch, ApiError, SingleResponse, PaginatedResponse } from '@/lib/api-client';
import { AdminRider, AdminOrder } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DetailRow } from '@/components/detail-row';
import { SuspendToggle } from '@/components/suspend-toggle';
import { AvatarInitials } from '@/components/avatar-initials';
import { Badge } from '@/components/ui/badge';
import { PaginationControls } from '@/components/pagination-controls';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { formatDate, statusBadgeVariant } from '@/lib/format';
import { setRiderSuspended } from '../actions';

const LIMIT = 10;

export default async function RiderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const skip = Number(query.skip ?? 0);

  let rider: AdminRider;
  let orders: PaginatedResponse<AdminOrder>;
  try {
    const result = await authedFetch<SingleResponse<AdminRider>>(
      `/riders/admin/${id}`
    );
    rider = result.data;
    orders = await authedFetch<PaginatedResponse<AdminOrder>>(
      `/riders/admin/${id}/orders?skip=${skip}&limit=${LIMIT}`
    );
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

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div className="flex items-center gap-3.5">
        <AvatarInitials name={`${rider.firstName ?? ''} ${rider.lastName ?? ''}`} size="lg" />
        <h1 className="text-[22px] font-bold tracking-tight">
          {rider.firstName} {rider.lastName}
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <DetailRow label="Email" value={rider.email} />
          <DetailRow label="Phone" value={rider.phone} />
          <DetailRow
            label="Online status"
            value={<Badge variant={statusBadgeVariant(rider.status)} dot>{rider.status}</Badge>}
          />
          <DetailRow label="Orders completed" value={rider.ordersCompleted} />
          <DetailRow
            label="Account status"
            value={
              <SuspendToggle
                suspended={!!rider.suspended}
                action={setRiderSuspended.bind(null, rider._id)}
              />
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order history</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Delivery status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.data.map((order) => (
                <TableRow key={order._id}>
                  <TableCell>
                    <span className="rounded bg-chip px-2 py-0.5 font-mono text-xs">
                      {order.orderId}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(order.status)} dot>{order.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(order.orderDeliveryStatus)} dot>
                      {order.orderDeliveryStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    ₦{order.totalPrice?.toLocaleString()}
                  </TableCell>
                  <TableCell>{formatDate(order.createdAt)}</TableCell>
                </TableRow>
              ))}
              {orders.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No orders yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <PaginationControls
            skip={skip}
            limit={LIMIT}
            totalCount={orders.totalCount}
            basePath={`/riders/${id}`}
            searchParams={query}
          />
        </CardContent>
      </Card>
    </div>
  );
}
