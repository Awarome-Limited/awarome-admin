'use server';

import { revalidatePath } from 'next/cache';
import { authedFetch, PaginatedResponse } from '@/lib/api-client';
import { AdminUser } from '@/lib/types';

export interface UserExportRow {
  name: string;
  phone: string;
  email: string;
  source: string;
  signupDate: string;
}

export async function exportUsers(params: {
  search?: string;
  filter?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<UserExportRow[]> {
  const query = new URLSearchParams();
  query.set('skip', '0');
  query.set('limit', '0'); // 0 = no limit

  if (params.search) query.set('search', params.search);
  if (params.dateFrom) query.set('createdFrom', params.dateFrom);
  if (params.dateTo) query.set('createdTo', params.dateTo);

  if (params.filter === 'customers') query.set('role', 'customer');
  else if (params.filter === 'vendor-agents') query.set('role', 'vendorAgent');
  else if (params.filter === 'suspended') query.set('suspended', 'true');

  const result = await authedFetch<PaginatedResponse<AdminUser>>(
    `/users/admin?${query.toString()}`
  );

  return result.data.map((u) => ({
    name: [u.firstName, u.lastName].filter(Boolean).join(' ') || '',
    phone: u.phone || '',
    email: u.email || '',
    source: u.source || '',
    signupDate: u.createdAt ? new Date(u.createdAt).toISOString().slice(0, 10) : '',
  }));
}

export async function setUserSuspended(id: string, suspended: boolean) {
  await authedFetch(`/users/admin/${id}/suspend`, {
    method: 'PATCH',
    body: { suspended },
  });
  revalidatePath('/users');
  revalidatePath(`/users/${id}`);
}

export async function updateUser(
  id: string,
  body: { firstName?: string; lastName?: string; phone?: string; state?: string; source?: string }
) {
  await authedFetch(`/users/admin/${id}`, { method: 'PATCH', body });
  revalidatePath('/users');
  revalidatePath(`/users/${id}`);
}

export async function deleteUser(id: string) {
  await authedFetch(`/users/admin/${id}`, { method: 'DELETE' });
  revalidatePath('/users');
}
