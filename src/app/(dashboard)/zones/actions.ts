'use server';

import { revalidatePath } from 'next/cache';
import { authedFetch } from '@/lib/api-client';
import { DeliveryZoneConfig } from '@/lib/types';

export async function updateDeliveryZones(payload: DeliveryZoneConfig) {
  await authedFetch('/admins/delivery-zones', {
    method: 'PATCH',
    body: payload,
  });
  revalidatePath('/zones');
}
