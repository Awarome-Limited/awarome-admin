'use server';

import { revalidatePath } from 'next/cache';
import { authedFetch } from '@/lib/api-client';
import { StaffRole } from '@/lib/permissions';

export interface CreateStaffPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: StaffRole;
}

export interface UpdateStaffPayload {
  firstName?: string;
  lastName?: string;
  role?: StaffRole;
  permissions?: string[];
  isActive?: boolean;
}

export async function createStaff(payload: CreateStaffPayload) {
  await authedFetch('/admins/staff', { method: 'POST', body: payload });
  revalidatePath('/staff');
}

export async function updateStaff(id: string, payload: UpdateStaffPayload) {
  await authedFetch(`/admins/staff/${id}`, { method: 'PATCH', body: payload });
  revalidatePath('/staff');
  revalidatePath(`/staff/${id}`);
}

export async function setStaffActive(id: string, isActive: boolean) {
  await authedFetch(`/admins/staff/${id}`, {
    method: 'PATCH',
    body: { isActive },
  });
  revalidatePath('/staff');
  revalidatePath(`/staff/${id}`);
}

export async function setStaffSuspended(id: string, suspended: boolean) {
  return setStaffActive(id, !suspended);
}

export async function deleteStaff(id: string) {
  await authedFetch(`/admins/staff/${id}`, { method: 'DELETE' });
  revalidatePath('/staff');
}
