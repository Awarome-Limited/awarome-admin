'use server';

import { refresh, revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { authedFetch, ApiError, PaginatedResponse } from '@/lib/api-client';
import { runAction, type ActionResult } from '@/lib/action-result';
import type { AdminScheduledPush, ScheduledPushReach } from '@/lib/types';
import type { ScheduledPushPayload } from '@/lib/scheduled-push';

const SCHEDULED_PATH = '/push-notifications/scheduled';

export async function getScheduledPushes(params: {
  status?: string;
  skip: number;
  limit: number;
}): Promise<PaginatedResponse<AdminScheduledPush>> {
  const query = new URLSearchParams({
    skip: String(params.skip),
    limit: String(params.limit),
  });
  if (params.status) query.set('status', params.status);

  return authedFetch<PaginatedResponse<AdminScheduledPush>>(
    `/admins/scheduled-push?${query.toString()}`
  );
}

/** Estimates only: a failure leaves the scheduler usable, just without counts. */
export async function getPushReach(): Promise<ScheduledPushReach | null> {
  try {
    const res = await authedFetch<{ data: ScheduledPushReach }>('/admins/scheduled-push/reach');
    return res.data;
  } catch (error) {
    unstable_rethrow(error);
    console.error('Push reach fetch failed', error);
    return null;
  }
}

export type CreateScheduledPushesResult =
  | { ok: true; created: number }
  | { ok: false; error: string; rowErrors?: { index: number; message: string }[] };

export async function createScheduledPushes(
  items: ScheduledPushPayload[]
): Promise<CreateScheduledPushesResult> {
  try {
    const res = await authedFetch<{ data: AdminScheduledPush[] }>('/admins/scheduled-push', {
      method: 'POST',
      body: { items },
    });
    revalidatePath(SCHEDULED_PATH);
    return { ok: true, created: res.data.length };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ApiError) {
      // The API reports every bad row by index so the builder can mark it.
      const data = error.data as { data?: { errors?: { index: number; message: string }[] } };
      return { ok: false, error: error.message, rowErrors: data?.data?.errors };
    }
    console.error('Scheduling pushes failed', error);
    return { ok: false, error: 'Something went wrong. Please try again.' };
  }
}

export async function updateScheduledPush(
  id: string,
  payload: ScheduledPushPayload
): Promise<ActionResult> {
  const result = await runAction(() =>
    authedFetch(`/admins/scheduled-push/${id}`, { method: 'PATCH', body: payload })
  );
  revalidatePath(SCHEDULED_PATH);
  refresh();
  return result;
}

export async function cancelScheduledPush(id: string): Promise<ActionResult> {
  const result = await runAction(() =>
    authedFetch(`/admins/scheduled-push/${id}/cancel`, { method: 'POST' })
  );
  revalidatePath(SCHEDULED_PATH);
  refresh();
  return result;
}
