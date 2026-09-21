'use server';

import { refresh, revalidatePath } from 'next/cache';
import { authedFetch, SingleResponse } from '@/lib/api-client';
import { runAction, type ActionResult } from '@/lib/action-result';
import { IssuedPartnerApiKey } from '@/lib/types';

export interface CreatePartnerPayload {
  name: string;
  email: string;
  phone: string;
  address?: string;
  state?: string;
  country?: string;
  location?: { lat: number; long: number };
}

export async function createPartner(payload: CreatePartnerPayload) {
  await authedFetch('/admins/partners', { method: 'POST', body: payload });
  revalidatePath('/partners');
}

export interface ApiAccessPayload {
  apiEnabled?: boolean;
  /** Kobo. 0 switches the low-balance alert off. */
  lowBalanceThreshold?: number;
  defaultRequirePin?: boolean;
  apiSuspendedReason?: string;
}

export async function updateApiAccess(
  id: string,
  payload: ApiAccessPayload
): Promise<ActionResult> {
  return runAction(async () => {
    await authedFetch(`/admins/partners/${id}/api-access`, {
      method: 'PATCH',
      body: payload,
    });
    revalidatePath('/partners');
    revalidatePath(`/partners/${id}`);
    refresh();
  });
}

/**
 * Issues a key pair. The secret comes back exactly once — it is stored only
 * as a hash, so it cannot be shown again and the caller must surface it
 * before the dialog closes.
 */
export async function issueApiKey(
  id: string,
  payload: { label?: string; issuedTo?: string }
): Promise<IssuedPartnerApiKey> {
  const response = await authedFetch<SingleResponse<IssuedPartnerApiKey>>(
    `/admins/partners/${id}/keys`,
    { method: 'POST', body: payload }
  );
  revalidatePath(`/partners/${id}`);
  return response.data;
}

export async function revokeApiKey(
  id: string,
  keyId: string
): Promise<ActionResult> {
  return runAction(async () => {
    await authedFetch(`/admins/partners/${id}/keys/${keyId}`, {
      method: 'DELETE',
    });
    revalidatePath(`/partners/${id}`);
    refresh();
  });
}

export interface CreatePartnerContactPayload {
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  role?: 'owner' | 'developer' | 'viewer';
}

export async function createPartnerContact(
  id: string,
  payload: CreatePartnerContactPayload
) {
  await authedFetch(`/admins/partners/${id}/users`, {
    method: 'POST',
    body: payload,
  });
  revalidatePath(`/partners/${id}`);
}

export async function setPartnerContactSuspended(
  id: string,
  contactId: string,
  suspended: boolean
) {
  await authedFetch(`/admins/partners/${id}/users/${contactId}`, {
    method: 'PATCH',
    body: { status: suspended ? 'suspended' : 'active' },
  });
  revalidatePath(`/partners/${id}`);
  refresh();
}
