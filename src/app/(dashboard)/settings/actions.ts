'use server';

import { authedFetch } from '@/lib/api-client';

export async function changePassword(currentPassword: string, newPassword: string) {
  await authedFetch('/admins/staff/me/password', {
    method: 'PATCH',
    body: { currentPassword, newPassword },
  });
}
