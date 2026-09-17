'use server';

import { refresh, revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { authedFetch, ApiError } from '@/lib/api-client';
import { runAction, type ActionResult } from '@/lib/action-result';
import { AdminAudienceList, AdminAudienceListDetail } from '@/lib/types';
import type { PushAudience } from '@/lib/scheduled-push';

export interface SendPushPayload {
  title: string;
  body: string;
  token: string;
}

export interface BroadcastPushPayload {
  title: string;
  body: string;
  audience: PushAudience;
  audienceListId?: string;
}

export interface BroadcastResult {
  sent: number;
  failed: number;
  total: number;
}

export interface ContactsPayload {
  phones: string[];
  emails: string[];
}

export type AudienceListResult =
  | { ok: true; list: AdminAudienceList }
  | { ok: false; error: string };

// A thrown Server Action error is redacted in production; the API's message
// ("At least one phone number or email is required") is what people need.
function failure(error: unknown, label: string): { ok: false; error: string } {
  unstable_rethrow(error);
  if (error instanceof ApiError) return { ok: false, error: error.message };
  console.error(label, error);
  return { ok: false, error: 'Something went wrong. Please try again.' };
}

export async function sendPushNotification(payload: SendPushPayload) {
  await authedFetch('/notifications/trigger-push', {
    method: 'POST',
    body: payload,
  });
}

export async function broadcastPushNotification(
  payload: BroadcastPushPayload
): Promise<({ ok: true } & BroadcastResult) | { ok: false; error: string }> {
  try {
    const res = await authedFetch<{ data: BroadcastResult; message: string }>(
      '/notifications/broadcast',
      { method: 'POST', body: payload }
    );
    return { ok: true, ...res.data };
  } catch (error) {
    return failure(error, 'Push broadcast failed');
  }
}

export async function getAudienceLists(): Promise<AdminAudienceList[]> {
  const res = await authedFetch<{ data: AdminAudienceList[] }>(
    '/notifications/audience-lists'
  );
  return res.data ?? [];
}

export async function getAudienceList(id: string): Promise<AdminAudienceListDetail> {
  const res = await authedFetch<{ data: AdminAudienceListDetail }>(
    `/notifications/audience-lists/${id}`
  );
  return res.data;
}

export async function updateAudienceListName(id: string, name: string): Promise<ActionResult> {
  const result = await runAction(() =>
    authedFetch(`/notifications/audience-lists/${id}`, {
      method: 'PATCH',
      body: { name },
    })
  );
  revalidatePath('/push-notifications');
  revalidatePath(`/push-notifications/audience-lists/${id}`);
  refresh();
  return result;
}

export async function replaceAudienceListContacts(
  id: string,
  contacts: ContactsPayload
): Promise<ActionResult> {
  const result = await runAction(() =>
    authedFetch(`/notifications/audience-lists/${id}`, {
      method: 'PATCH',
      body: contacts,
    })
  );
  revalidatePath('/push-notifications');
  revalidatePath(`/push-notifications/audience-lists/${id}`);
  refresh();
  return result;
}

export async function deleteAudienceList(id: string): Promise<void> {
  await authedFetch(`/notifications/audience-lists/${id}`, { method: 'DELETE' });
  revalidatePath('/push-notifications');
  refresh();
}

export async function createAudienceList(
  name: string,
  contacts: ContactsPayload
): Promise<AudienceListResult> {
  try {
    const res = await authedFetch<{ data: AdminAudienceList }>(
      '/notifications/audience-lists',
      { method: 'POST', body: { name, ...contacts } }
    );
    revalidatePath('/push-notifications');
    return { ok: true, list: res.data };
  } catch (error) {
    return failure(error, 'Audience list create failed');
  }
}
