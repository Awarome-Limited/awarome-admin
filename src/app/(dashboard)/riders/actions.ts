'use server';

import { refresh, revalidatePath } from 'next/cache';
import { authedFetch } from '@/lib/api-client';
import { runAction, type ActionResult } from '@/lib/action-result';

export async function setRiderSuspended(id: string, suspended: boolean) {
  await authedFetch(`/riders/admin/${id}/suspend`, {
    method: 'PATCH',
    body: { suspended },
  });
  revalidatePath('/riders');
  revalidatePath('/riders/approvals');
  revalidatePath(`/riders/${id}`);
  refresh();
}

export async function updateRiderProfileStatus(id: string, status: 'approved' | 'rejected') {
  try {
    await authedFetch(`/riders/admin/${id}/verify`, {
      method: 'PATCH',
      body: { status, verificationStatus: status },
    });
  } catch {
    try {
      await authedFetch(`/riders/admin/${id}/approve`, {
        method: 'PATCH',
        body: { status },
      });
    } catch {
      await authedFetch(`/riders/admin/${id}`, {
        method: 'PATCH',
        body: { profileStatus: status, verificationStatus: status, status },
      });
    }
  }
  revalidatePath('/riders');
  revalidatePath('/riders/approvals');
  revalidatePath(`/riders/${id}`);
  refresh();
}

/** Ask Paystack again for a rider's collection account. */
export async function retryRiderCollectionAccount(id: string): Promise<ActionResult> {
  const result = await runAction(() =>
    authedFetch(`/riders/admin/${id}/collection-account/retry`, { method: 'POST' })
  );
  if (result.ok) revalidatePath(`/riders/${id}`);
  return result;
}

/** One-off: request collection accounts for every approved rider without one. */
export async function backfillRiderCollectionAccounts(): Promise<
  { ok: true; message: string } | { ok: false; error: string }
> {
  let message = '';
  const result = await runAction(async () => {
    const res = await authedFetch<{ message: string }>(
      '/riders/admin/collection-accounts/backfill',
      { method: 'POST' }
    );
    message = res.message;
  });
  return result.ok ? { ok: true, message } : result;
}
