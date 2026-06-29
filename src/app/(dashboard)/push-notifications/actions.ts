'use server';

import { authedFetch } from '@/lib/api-client';
import { AdminAudienceList, AdminAudienceListDetail } from '@/lib/types';

export interface SendPushPayload {
  title: string;
  body: string;
  token: string;
}

export interface BroadcastPushPayload {
  title: string;
  body: string;
  audience: 'all' | 'customers' | 'riders' | 'custom';
  audienceListId?: string;
}

export interface BroadcastResult {
  sent: number;
  failed: number;
  total: number;
}

export interface CreateAudienceListResult {
  _id: string;
  name: string;
  totalPhones: number;
  matchedCount: number;
}

export async function sendPushNotification(payload: SendPushPayload) {
  await authedFetch('/notifications/trigger-push', {
    method: 'POST',
    body: payload,
  });
}

export async function broadcastPushNotification(
  payload: BroadcastPushPayload
): Promise<BroadcastResult> {
  const res = await authedFetch<{ data: BroadcastResult; message: string }>(
    '/notifications/broadcast',
    { method: 'POST', body: payload }
  );
  return res.data;
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

export async function updateAudienceListName(id: string, name: string): Promise<void> {
  await authedFetch(`/notifications/audience-lists/${id}`, {
    method: 'PATCH',
    body: { name },
  });
}

export async function replaceAudienceListPhones(id: string, formData: FormData): Promise<AdminAudienceList> {
  const file = formData.get('file') as File | null;
  if (!file) throw new Error('CSV file is required');

  const text = await file.text();
  const phones = text
    .split(/\r?\n/)
    .map((line) => {
      let p = line.replace(/["'\s]/g, '');
      if (p.startsWith('+')) p = p.slice(1);
      if (p.startsWith('0')) p = '234' + p.slice(1);
      return p;
    })
    .filter((line) => line.length > 0 && !/^phone/i.test(line));

  if (phones.length === 0) throw new Error('No phone numbers found in the CSV file');

  const res = await authedFetch<{ data: AdminAudienceList }>(
    `/notifications/audience-lists/${id}`,
    { method: 'PATCH', body: { phones } }
  );
  return res.data;
}

export async function deleteAudienceList(id: string): Promise<void> {
  await authedFetch(`/notifications/audience-lists/${id}`, { method: 'DELETE' });
}

export async function createAudienceList(formData: FormData): Promise<CreateAudienceListResult> {
  const name = formData.get('name')?.toString().trim() ?? '';
  const file = formData.get('file') as File | null;

  if (!name) throw new Error('List name is required');
  if (!file) throw new Error('CSV file is required');

  const text = await file.text();
  const phones = text
    .split(/\r?\n/)
    .map((line) => {
      let p = line.replace(/["'\s]/g, '');
      if (p.startsWith('+')) p = p.slice(1);   // +234... → 234...
      if (p.startsWith('0')) p = '234' + p.slice(1); // 0xxx → 234xxx
      return p;
    })
    .filter((line) => line.length > 0 && !/^phone/i.test(line));

  if (phones.length === 0) throw new Error('No phone numbers found in the CSV file');

  const res = await authedFetch<{ data: CreateAudienceListResult }>(
    '/notifications/audience-lists',
    { method: 'POST', body: { name, phones } }
  );
  return res.data;
}
