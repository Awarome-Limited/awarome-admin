'use server';

import { revalidatePath } from 'next/cache';
import { authedFetch } from '@/lib/api-client';

/**
 * Ops cancelling a run outright. Shared by the order and delivery detail
 * pages, which is why it lives here rather than in either route's actions.
 */
export async function cancelJob(
  jobType: 'order' | 'delivery',
  id: string,
  payload: { reason: string; refund?: boolean }
) {
  await authedFetch(`/admins/jobs/${jobType}/${id}/cancel`, {
    method: 'POST',
    body: payload,
  });
  const base = jobType === 'order' ? '/orders' : '/deliveries';
  revalidatePath(base);
  revalidatePath(`${base}/${id}`);
  revalidatePath('/refunds');
  revalidatePath('/cancellations');
}
