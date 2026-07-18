'use server';

import { revalidatePath } from 'next/cache';
import { authedFetch } from '@/lib/api-client';

export async function markRefunded(jobType: 'order' | 'delivery', id: string) {
  await authedFetch(`/admins/refunds/${jobType}/${id}`, {
    method: 'PATCH',
  });
  revalidatePath('/refunds');
}
