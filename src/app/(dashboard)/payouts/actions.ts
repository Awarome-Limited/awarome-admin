'use server';

import { revalidatePath } from 'next/cache';
import { authedFetch, type SingleResponse } from '@/lib/api-client';
import { runAction, type ActionResult } from '@/lib/action-result';
import type { AdminRiderPayout, PayoutSchedule, PayoutSettings } from '@/lib/types';

function revalidatePayouts(riderId?: string) {
  revalidatePath('/payouts', 'layout');
  if (riderId) revalidatePath(`/riders/${riderId}`);
}

export async function startPayoutRun(): Promise<ActionResult> {
  const result = await runAction(() =>
    authedFetch('/admins/payouts/runs', { method: 'POST' })
  );
  if (result.ok) revalidatePayouts();
  return result;
}

/**
 * Paystack refusing a transfer (unfunded balance, bad recipient) still creates
 * a payout record, so the API answers 200 with a failed payout. That is a
 * failure to the person who pressed the button, and its reason is the point.
 */
export async function payRiderNow(riderId: string): Promise<ActionResult> {
  let payout: SingleResponse<AdminRiderPayout> | undefined;
  const result = await runAction(async () => {
    payout = await authedFetch<SingleResponse<AdminRiderPayout>>(
      `/admins/payouts/riders/${riderId}`,
      { method: 'POST' }
    );
  });
  revalidatePayouts(riderId);
  if (result.ok && payout?.data.status === 'failed') {
    return { ok: false, error: payout.message };
  }
  return result;
}

export async function refreshPayout(payoutId: string): Promise<ActionResult> {
  const result = await runAction(() =>
    authedFetch(`/admins/payouts/${payoutId}/refresh`, { method: 'POST' })
  );
  if (result.ok) revalidatePayouts();
  return result;
}

export async function updatePayoutSettings(values: PayoutSchedule): Promise<ActionResult> {
  const payload: PayoutSettings = {
    payoutsEnabled: values.enabled,
    payoutHourLagos: values.hourLagos,
    payoutMinAmount: values.minAmount,
  };
  const result = await runAction(() =>
    authedFetch('/admins/dispatch-config', { method: 'PATCH', body: payload })
  );
  if (result.ok) {
    revalidatePayouts();
    revalidatePath('/dispatch');
  }
  return result;
}
