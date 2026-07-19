'use server';

import { revalidatePath } from 'next/cache';
import { authedFetch } from '@/lib/api-client';

export async function setRiderSuspended(id: string, suspended: boolean) {
  await authedFetch(`/riders/admin/${id}/suspend`, {
    method: 'PATCH',
    body: { suspended },
  });
  revalidatePath('/riders');
  revalidatePath('/riders/approvals');
  revalidatePath(`/riders/${id}`);
}

export async function updateRiderProfileStatus(id: string, status: 'approved' | 'rejected') {
  try {
    await authedFetch(`/riders/admin/${id}/approve`, {
      method: 'PATCH',
      body: { status },
    });
  } catch {
    await authedFetch(`/riders/admin/${id}`, {
      method: 'PATCH',
      body: { profileStatus: status, status },
    });
  }
  revalidatePath('/riders');
  revalidatePath('/riders/approvals');
  revalidatePath(`/riders/${id}`);
}
