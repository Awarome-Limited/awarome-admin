'use server';

import { revalidatePath } from 'next/cache';
import { authedFetch } from '@/lib/api-client';

export async function updateDeliveryStatus(id: string, status: string) {
  await authedFetch(`/deliveries/admin/${id}/status`, {
    method: 'PATCH',
    body: { status },
  });
  revalidatePath('/deliveries');
  revalidatePath(`/deliveries/${id}`);
}
