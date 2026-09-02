'use server';

import { revalidatePath } from 'next/cache';
import { authedFetch } from '@/lib/api-client';

/**
 * Answer a rider's post-pickup cancellation request.
 *
 * Approving ends the run for that one customer — on a batch it takes only that
 * stop off the trip, the rest carries on. `refund` is a separate decision: it
 * puts the customer in the refunds queue, where the money is still moved by
 * hand.
 */
export async function resolveCancellation(
  jobType: 'order' | 'delivery',
  id: string,
  payload: { decision: 'approve' | 'decline'; refund?: boolean; note?: string }
) {
  await authedFetch(`/admins/cancellation-requests/${jobType}/${id}`, {
    method: 'POST',
    body: payload,
  });
  revalidatePath('/cancellations');
  revalidatePath('/refunds');
}
