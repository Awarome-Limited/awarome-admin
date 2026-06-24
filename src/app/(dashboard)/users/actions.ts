'use server';

import { revalidatePath } from 'next/cache';
import { authedFetch } from '@/lib/api-client';

export async function setUserSuspended(id: string, suspended: boolean) {
  await authedFetch(`/users/admin/${id}/suspend`, {
    method: 'PATCH',
    body: { suspended },
  });
  revalidatePath('/users');
  revalidatePath(`/users/${id}`);
}

export async function deleteUser(id: string) {
  await authedFetch(`/users/admin/${id}`, { method: 'DELETE' });
  revalidatePath('/users');
}
