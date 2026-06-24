'use server';

import { revalidatePath } from 'next/cache';
import { authedFetch } from '@/lib/api-client';

export interface AdjustWalletPayload {
  amount: number;
  type: 'credit' | 'debit';
  description: string;
}

export async function adjustWallet(id: string, payload: AdjustWalletPayload) {
  await authedFetch(`/admins/wallets/${id}/adjust`, {
    method: 'POST',
    body: payload,
  });
  revalidatePath('/payments/wallets');
  revalidatePath(`/payments/wallets/${id}`);
}
