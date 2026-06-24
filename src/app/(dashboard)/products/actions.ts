'use server';

import { authedFetch } from '@/lib/api-client';
import { revalidatePath } from 'next/cache';

export async function updateProduct(
  id: string,
  payload: {
    name?: string;
    price?: number;
    quantityAvailable?: number;
    description?: string;
    category?: string;
    isAvailable?: boolean;
    deliveryMethod?: string;
  }
) {
  const clean: Record<string, unknown> = {};
  if (payload.name !== undefined) clean.name = payload.name;
  if (payload.price !== undefined) clean.price = Number(payload.price);
  if (payload.quantityAvailable !== undefined) clean.quantityAvailable = Number(payload.quantityAvailable);
  if (payload.description !== undefined) clean.description = payload.description;
  if (payload.category !== undefined) clean.category = payload.category;
  if (payload.isAvailable !== undefined) clean.isAvailable = payload.isAvailable;
  if (payload.deliveryMethod !== undefined) clean.deliveryMethod = payload.deliveryMethod;

  await authedFetch(`/products/admin/${id}`, {
    method: 'PATCH',
    body: clean,
  });

  revalidatePath(`/products/${id}`);
  revalidatePath('/products');
}
