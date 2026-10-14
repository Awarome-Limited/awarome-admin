'use server';

import { revalidatePath } from 'next/cache';
import { authedFetch } from '@/lib/api-client';
import { runAction, type ActionResult } from '@/lib/action-result';

/**
 * Answer a rider's support ticket.
 *
 *  - approve: cash → the rider collects cash for that drop. amount-change →
 *    `amount` is the new item amount (naira), the number the business typed at
 *    booking; the fees are worked out again and the rider and business apps
 *    both read the new figures.
 *  - decline: nothing changes for the run.
 *  - resolve: reports (address, package, other) — dealt with by phone.
 */
export async function resolveSupportTicket(
  id: string,
  payload: { decision: 'approve' | 'decline' | 'resolve'; note?: string; amount?: number }
): Promise<ActionResult> {
  const result = await runAction(() =>
    authedFetch(`/admins/support-tickets/${id}/resolve`, {
      method: 'POST',
      body: payload,
    })
  );
  if (result.ok) {
    revalidatePath('/support-tickets');
    revalidatePath('/deliveries');
  }
  return result;
}
