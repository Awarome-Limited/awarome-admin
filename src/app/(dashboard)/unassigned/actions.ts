'use server';

import { revalidatePath } from 'next/cache';
import { authedFetch } from '@/lib/api-client';

export async function redispatchJob(jobType: 'order' | 'delivery', id: string) {
  await authedFetch(`/admins/unassigned-jobs/${jobType}/${id}/redispatch`, {
    method: 'POST',
  });
  revalidatePath('/unassigned');
}

export async function redispatchBatch(batchId: string) {
  await authedFetch(`/admins/unassigned-batches/${batchId}/redispatch`, {
    method: 'POST',
  });
  revalidatePath('/unassigned');
}
