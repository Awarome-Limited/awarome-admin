'use server';

import { authedFetch } from '@/lib/api-client';
import { runAction, type ActionResult } from '@/lib/action-result';
import { refresh, revalidatePath } from 'next/cache';

export interface ProductEditPayload {
  name?: string;
  price?: number;
  quantityAvailable?: number;
  description?: string;
  category?: string;
  isAvailable?: boolean;
  deliveryMethod?: string;
}

export async function updateProduct(
  id: string,
  payload: ProductEditPayload
): Promise<ActionResult> {
  const clean: Record<string, unknown> = {};
  if (payload.name !== undefined) clean.name = payload.name;
  if (payload.price !== undefined) clean.price = Number(payload.price);
  if (payload.quantityAvailable !== undefined) clean.quantityAvailable = Number(payload.quantityAvailable);
  if (payload.description !== undefined) clean.description = payload.description;
  if (payload.category !== undefined) clean.category = payload.category;
  if (payload.isAvailable !== undefined) clean.isAvailable = payload.isAvailable;
  if (payload.deliveryMethod !== undefined) clean.deliveryMethod = payload.deliveryMethod;

  return runAction(async () => {
    // PATCH lives at /products/:id — /products/admin/:id is the GET-only detail
    // route, so patching it 404s and takes the whole page down.
    await authedFetch(`/products/${id}`, {
      method: 'PATCH',
      body: clean,
    });

    revalidatePath(`/products/${id}`);
    revalidatePath('/products');
    // The detail page is dynamic (no-store fetches), so there is no cache entry
    // for revalidatePath to drop. refresh() re-renders the current page, which
    // is what makes the form and the summary show the values just saved.
    refresh();
  });
}
