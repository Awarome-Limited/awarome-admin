'use server';

import { revalidatePath } from 'next/cache';
import { authedFetch } from '@/lib/api-client';

export interface DispatchConfigPayload {
  batchTargetSize?: number;
  batchMaxSize?: { bike?: number; car?: number; truck?: number };
  dropoffRadiusKm?: number;
  pickupRadiusKm?: number;
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
}
