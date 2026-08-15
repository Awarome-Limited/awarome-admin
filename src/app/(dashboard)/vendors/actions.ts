'use server';

import { refresh, revalidatePath } from 'next/cache';
import { authedFetch } from '@/lib/api-client';
import { runAction, type ActionResult } from '@/lib/action-result';

export async function setVendorSuspended(id: string, suspended: boolean) {
  await authedFetch(`/vendors/admin/${id}/suspend`, {
    method: 'PATCH',
    body: { suspended },
  });
  revalidatePath('/vendors');
  revalidatePath(`/vendors/${id}`);
  refresh();
}

export interface VendorEditPayload {
  name?: string;
  businessName?: string;
  email?: string;
  phone?: string;
  address?: string;
  status?: string;
  opensAt?: string;
  closesAt?: string;
}

export async function updateVendor(
  id: string,
  payload: VendorEditPayload
): Promise<ActionResult> {
  return runAction(async () => {
    await authedFetch(`/vendors/admin/${id}`, {
      method: 'PATCH',
      body: payload,
    });
    revalidatePath('/vendors');
    revalidatePath(`/vendors/${id}`);
    refresh();
  });
}

export interface CreateVendorPayload {
  name: string;
  businessName?: string;
  email: string;
  phone: string;
  address: string;
  state?: string;
  country?: string;
  type: string[];
  opensAt: string;
  closesAt: string;
  location: { lat: number; long: number };
}

export async function createVendor(payload: CreateVendorPayload) {
  const result = await authedFetch<{ data: { vendor: { _id: string } } }>(
    '/vendors/admin',
    { method: 'POST', body: payload }
  );
  revalidatePath('/vendors');
  return result.data.vendor._id;
}
