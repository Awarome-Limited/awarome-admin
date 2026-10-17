'use server';

import { refresh, revalidatePath } from 'next/cache';
import { authedFetch } from '@/lib/api-client';
import { ServiceAreaConfig } from '@/lib/types';

export async function updateServiceArea(payload: ServiceAreaConfig) {
  await authedFetch('/admins/service-area', {
    method: 'PATCH',
    body: payload,
  });
  revalidatePath('/service-area');
  refresh();
}
