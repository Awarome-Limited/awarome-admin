'use server';

import { revalidatePath } from 'next/cache';
import { authedFetch, type SingleResponse } from '@/lib/api-client';
import { runAction, type ActionResult } from '@/lib/action-result';
import type { AdminVendorPayout, PayoutSchedule, VendorPayoutSettings } from '@/lib/types';

function revalidateVendorPayouts(vendorId?: string) {
  revalidatePath('/vendor-payouts', 'layout');
  if (vendorId) revalidatePath(`/vendors/${vendorId}`);
}

export async function startVendorPayoutRun(): Promise<ActionResult> {
  const result = await runAction(() =>
    authedFetch('/admins/vendor-payouts/runs', { method: 'POST' })
  );
  if (result.ok) revalidateVendorPayouts();
  return result;
}

/** A refused transfer still creates a (failed) payout; its reason is the answer. */
export async function payVendorNow(vendorId: string): Promise<ActionResult> {
  let payout: SingleResponse<AdminVendorPayout> | undefined;
  const result = await runAction(async () => {
    payout = await authedFetch<SingleResponse<AdminVendorPayout>>(
      `/admins/vendor-payouts/vendors/${vendorId}`,
      { method: 'POST' }
    );
  });
  revalidateVendorPayouts(vendorId);
  if (result.ok && payout?.data.status === 'failed') {
    return { ok: false, error: payout.message };
  }
  return result;
}

export async function refreshVendorPayout(payoutId: string): Promise<ActionResult> {
  const result = await runAction(() =>
    authedFetch(`/admins/vendor-payouts/${payoutId}/refresh`, { method: 'POST' })
  );
  if (result.ok) revalidateVendorPayouts();
  return result;
}

export async function updateVendorPayoutSettings(values: PayoutSchedule): Promise<ActionResult> {
  const payload: VendorPayoutSettings = {
    vendorPayoutsEnabled: values.enabled,
    vendorPayoutHourLagos: values.hourLagos,
    vendorPayoutMinAmount: values.minAmount,
  };
  const result = await runAction(() =>
    authedFetch('/admins/dispatch-config', { method: 'PATCH', body: payload })
  );
  if (result.ok) {
    revalidateVendorPayouts();
    revalidatePath('/dispatch');
  }
  return result;
}

export async function createVendorCommission(
  vendorId: string,
  payload: { percent: number; startDate: string; endDate?: string | null; note?: string }
): Promise<ActionResult & { message?: string }> {
  let message: string | undefined;
  const result = await runAction(async () => {
    const res = await authedFetch<SingleResponse<unknown>>(
      `/admins/vendors/${vendorId}/commissions`,
      { method: 'POST', body: payload }
    );
    message = res.message;
  });
  if (result.ok) revalidatePath(`/vendors/${vendorId}`);
  return result.ok ? { ok: true, message } : result;
}

export async function endVendorCommission(
  vendorId: string,
  commissionId: string,
  endDate: string
): Promise<ActionResult> {
  const result = await runAction(() =>
    authedFetch(`/admins/vendors/${vendorId}/commissions/${commissionId}`, {
      method: 'PATCH',
      body: { endDate },
    })
  );
  if (result.ok) revalidatePath(`/vendors/${vendorId}`);
  return result;
}
