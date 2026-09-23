'use server';

import { revalidatePath } from 'next/cache';
import { authedFetch } from '@/lib/api-client';
import { runAction, type ActionResult } from '@/lib/action-result';

export interface AssignBatchPayload {
  riderId: string;
  // One or the other: an existing batch waiting for a courier, or the
  // packages to build one out of right now.
  batchId?: string;
  jobs?: { jobType: 'order' | 'delivery'; id: string }[];
}

/**
 * Puts a named courier on a batch without waiting for it to fill up.
 *
 * Shared by the forming-batches queue and the unassigned page, which is why it
 * lives here rather than in either route's actions. The result is returned as
 * data: a thrown Server Action error is redacted in production, and the API's
 * own message ("A bike carries at most 5 drops in one run") is the entire
 * point of asking.
 */
export async function assignBatch(
  payload: AssignBatchPayload
): Promise<ActionResult> {
  const result = await runAction(() =>
    authedFetch('/admins/batches/assign', { method: 'POST', body: payload })
  );

  if (result.ok) {
    revalidatePath('/forming-batches');
    revalidatePath('/unassigned');
    revalidatePath('/deliveries');
    revalidatePath('/orders');
  }

  return result;
}
