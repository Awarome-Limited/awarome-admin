'use server';

import { revalidatePath } from 'next/cache';
import { authedFetch } from '@/lib/api-client';

export interface CampaignConfigPayload {
  campaigns?: Record<
    string,
    { enabled?: boolean; stepDelays?: Record<string, number> }
  >;
  maxMarketingPerDay?: number;
  quietStartHour?: number;
  quietEndHour?: number;
  sweepBatchLimit?: number;
  winbackMaxLookbackDays?: number;
}

export async function updateCampaignConfig(payload: CampaignConfigPayload) {
  await authedFetch('/admins/campaigns/config', {
    method: 'PATCH',
    body: payload,
  });
  revalidatePath('/campaigns');
}
