'use server';

import { revalidatePath } from 'next/cache';
import { authedFetch, type SingleResponse } from '@/lib/api-client';
import { runAction, type ActionResult } from '@/lib/action-result';
import type {
  AdminBusinessPayoutRecord,
  BusinessPayoutSettings,
  OfflinePayoutPayload,
  PayoutSchedule,
} from '@/lib/types';

function revalidateBusinessPayouts(businessId?: string) {
  revalidatePath('/business-payouts', 'layout');
  if (businessId) revalidatePath(`/businesses/${businessId}`);
}

export async function startBusinessPayoutRun(): Promise<ActionResult> {
  const result = await runAction(() =>
    authedFetch('/admins/business-payouts/runs', { method: 'POST' })
  );
  if (result.ok) revalidateBusinessPayouts();
  return result;
}

/** A refused transfer still creates a (failed) payout; its reason is the answer. */
export async function payBusinessNow(businessId: string): Promise<ActionResult> {
  let payout: SingleResponse<AdminBusinessPayoutRecord> | undefined;
  const result = await runAction(async () => {
    payout = await authedFetch<SingleResponse<AdminBusinessPayoutRecord>>(
      `/admins/business-payouts/businesses/${businessId}`,
      { method: 'POST' }
    );
  });
  revalidateBusinessPayouts(businessId);
  if (result.ok && payout?.data.status === 'failed') {
    return { ok: false, error: payout.message };
  }
  return result;
}

export async function refreshBusinessPayout(payoutId: string): Promise<ActionResult> {
  const result = await runAction(() =>
    authedFetch(`/admins/business-payouts/${payoutId}/refresh`, { method: 'POST' })
  );
  if (result.ok) revalidateBusinessPayouts();
  return result;
}

export async function updateBusinessPayoutSettings(values: PayoutSchedule): Promise<ActionResult> {
  const payload: BusinessPayoutSettings = {
    businessPayoutsEnabled: values.enabled,
    businessPayoutHourLagos: values.hourLagos,
    businessPayoutMinAmount: values.minAmount,
  };
  const result = await runAction(() =>
    authedFetch('/admins/dispatch-config', { method: 'PATCH', body: payload })
  );
  if (result.ok) {
    revalidateBusinessPayouts();
    revalidatePath('/dispatch');
  }
  return result;
}

/** Money already sent from Awarome's bank account; nothing is transferred. */
export async function recordBusinessBankPayout(
  businessId: string,
  payload: OfflinePayoutPayload
): Promise<ActionResult> {
  const result = await runAction(() =>
    authedFetch(`/admins/business-payouts/businesses/${businessId}/offline`, {
      method: 'POST',
      body: payload,
    })
  );
  if (result.ok) revalidateBusinessPayouts(businessId);
  return result;
}
