'use server';

import { refresh, revalidatePath } from 'next/cache';
import { authedFetch } from '@/lib/api-client';
import { DeliveryOptionsConfig } from '@/lib/types';

export async function updateDeliveryOptions(
  payload: Partial<DeliveryOptionsConfig>
) {
  await authedFetch('/admins/delivery-options', {
    method: 'PATCH',
    body: payload,
  });
  revalidatePath('/delivery-options');
  refresh();
}
