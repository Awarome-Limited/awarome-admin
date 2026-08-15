'use server';

import { refresh, revalidatePath } from 'next/cache';
import { authedFetch } from '@/lib/api-client';

export interface DispatchConfigPayload {
  batchTargetSize?: number;
  batchMaxSize?: { bike?: number; car?: number; truck?: number };
  batchMinSize?: { bike?: number; car?: number; truck?: number };
  batchMaxWaitMs?: number;
  dropoffRadiusKm?: number;
  pickupRadiusKm?: number;
  selectionCutoffMinutes?: number;
  dispatchRadiusKm?: number;
  maxRidersPerDispatch?: number;
  redispatchIntervalMs?: number;
  unassignedAfterMs?: number;
  vendorAcceptTimeoutMs?: number;
  riderCommissionPercent?: number;
}

export async function updateDispatchConfig(payload: DispatchConfigPayload) {
  await authedFetch('/admins/dispatch-config', {
    method: 'PATCH',
    body: payload,
  });
  revalidatePath('/dispatch');
  refresh();
}
