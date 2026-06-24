'use server';

import { revalidatePath } from 'next/cache';
import { authedFetch } from '@/lib/api-client';
import { PricingConfig } from '@/lib/types';

export async function updatePricingConfig(payload: Partial<PricingConfig>) {
  await authedFetch('/admins/pricing-config', {
    method: 'PATCH',
    body: payload,
  });
  revalidatePath('/pricing');
}
