'use server';

import { revalidatePath } from 'next/cache';
import { authedFetch } from '@/lib/api-client';
import { OperatingDay } from '@/lib/types';

export interface OperatingHoursPayload {
  days?: OperatingDay[];
  paused?: boolean;
  closedMessage?: string;
}

export async function updateOperatingHours(payload: OperatingHoursPayload) {
  await authedFetch('/admins/operating-hours', {
    method: 'PATCH',
    body: payload,
  });
  revalidatePath('/operating-hours');
}
