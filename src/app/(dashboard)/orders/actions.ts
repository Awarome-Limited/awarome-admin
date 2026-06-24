'use server';

import { revalidatePath } from 'next/cache';
import { authedFetch } from '@/lib/api-client';

export interface OrderStatusUpdate {
  status?: string;
  orderDeliveryStatus?: string;
  orderVendorStatus?: string;
}

export async function updateOrderStatus(id: string, payload: OrderStatusUpdate) {
  const body: OrderStatusUpdate = {};
  if (payload.status) body.status = payload.status;
  if (payload.orderDeliveryStatus) body.orderDeliveryStatus = payload.orderDeliveryStatus;
  if (payload.orderVendorStatus) body.orderVendorStatus = payload.orderVendorStatus;

  await authedFetch(`/admins/orders/${id}/status`, {
    method: 'PATCH',
    body,
  });
  revalidatePath('/orders');
  revalidatePath(`/orders/${id}`);
}
