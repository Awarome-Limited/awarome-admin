'use server';

import { authedFetch } from '@/lib/api-client';

export interface SendPushPayload {
  title: string;
  body: string;
  token: string;
}

export interface BroadcastPushPayload {
  title: string;
  body: string;
  audience: 'all' | 'customers' | 'riders';
}

export interface BroadcastResult {
  sent: number;
  failed: number;
  total: number;
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
