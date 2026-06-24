'use server';

import { revalidatePath } from 'next/cache';
import { authedFetch } from '@/lib/api-client';

export interface PromoCodePayload {
  code?: string;
  discountType?: 'fixed' | 'percentage';
  discountValue?: number;
  maxDiscountAmount?: number;
  applicability?: 'product' | 'delivery' | 'both';
  expiryDate?: string;
  usageLimit?: number;
  description?: string;
}

export async function createPromoCode(payload: PromoCodePayload) {
  await authedFetch('/promo-codes', { method: 'POST', body: payload });
  revalidatePath('/promo-codes');
}

export async function updatePromoCode(id: string, payload: PromoCodePayload) {
  await authedFetch(`/promo-codes/${id}`, { method: 'PUT', body: payload });
  revalidatePath('/promo-codes');
  revalidatePath(`/promo-codes/${id}`);
}

export async function togglePromoCodeActive(id: string) {
  await authedFetch(`/promo-codes/${id}/toggle-active`, { method: 'PATCH' });
  revalidatePath('/promo-codes');
  revalidatePath(`/promo-codes/${id}`);
}

export async function deletePromoCode(id: string) {
  await authedFetch(`/promo-codes/${id}`, { method: 'DELETE' });
  revalidatePath('/promo-codes');
}
