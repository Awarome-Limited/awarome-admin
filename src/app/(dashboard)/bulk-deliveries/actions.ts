'use server';

import { refresh, revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import {
  ApiError,
  authedFetch,
  type PaginatedResponse,
  type SingleResponse,
} from '@/lib/api-client';
import { runAction, type ActionResult } from '@/lib/action-result';
import type {
  AdminBulkDelivery,
  AdminUser,
  BulkDispatchMode,
  BulkDropPayer,
  BulkPricingTerms,
  BulkQuote,
  BulkRunSize,
  DeliveryAddress,
} from '@/lib/types';

export interface BulkCustomer {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface PlaceSuggestion {
  placeId: string;
  primary: string;
  secondary: string;
}

export interface PickupSuggestion {
  label: string;
  address: DeliveryAddress;
  sender?: { name?: string; phone?: string };
}

export interface BulkDropPayload {
  dropoffAddress: DeliveryAddress;
  receiver: { name: string; phone: string };
  note?: string;
  payer: BulkDropPayer;
  fee?: number;
  amountToCollect?: number;
  far?: boolean;
}

export interface CreateBulkPayload {
  /** One per bulk being filled in; a repeat returns the bulk already booked. */
  requestKey: string;
  userId: string;
  pickupAddress: DeliveryAddress;
  sender: { name: string; phone: string };
  vehicleType: string;
  pricingTerms: BulkPricingTerms;
  note?: string;
  requirePin: boolean;
  dispatchMode: BulkDispatchMode;
  /** The rider taking the whole bulk, for the `rider` mode. */
  riderId?: string;
  fillFromPool: boolean;
  runSize: BulkRunSize;
  drops: BulkDropPayload[];
}

type DataResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Like runAction, but hands back the response body for the form to use. */
async function fetchResult<T>(load: () => Promise<T>): Promise<DataResult<T>> {
  try {
    return { ok: true, data: await load() };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ApiError) return { ok: false, error: error.message };
    console.error('Bulk delivery request failed', error);
    return { ok: false, error: 'Something went wrong. Please try again.' };
  }
}

/** Type-ahead for the customer the bulk is booked under. */
export async function searchBulkCustomers(query: string): Promise<BulkCustomer[]> {
  const search = query.trim();
  if (search.length < 2) return [];

  try {
    const res = await authedFetch<PaginatedResponse<AdminUser>>(
      `/users/admin?search=${encodeURIComponent(search)}&limit=8&skip=0`
    );
    return res.data.map((user) => ({
      _id: user._id,
      name:
        [user.firstName, user.lastName].filter(Boolean).join(' ') ||
        user.email ||
        user.phone ||
        'Unnamed customer',
      email: user.email,
      phone: user.phone,
    }));
  } catch (error) {
    unstable_rethrow(error);
    console.error('Customer search failed', error);
    return [];
  }
}

export async function getCustomerPickups(userId: string): Promise<PickupSuggestion[]> {
  try {
    const res = await authedFetch<SingleResponse<PickupSuggestion[]>>(
      `/bulk-deliveries/customers/${userId}/pickups`
    );
    return res.data;
  } catch (error) {
    unstable_rethrow(error);
    return [];
  }
}

export async function searchPlaces(
  query: string,
  session: string
): Promise<DataResult<PlaceSuggestion[]>> {
  return fetchResult(async () => {
    const res = await authedFetch<SingleResponse<PlaceSuggestion[]>>(
      `/bulk-deliveries/places?q=${encodeURIComponent(query)}&session=${encodeURIComponent(session)}`
    );
    return res.data;
  });
}

export async function getPlace(
  placeId: string,
  session: string
): Promise<DataResult<DeliveryAddress>> {
  return fetchResult(async () => {
    const res = await authedFetch<SingleResponse<DeliveryAddress>>(
      `/bulk-deliveries/places/${encodeURIComponent(placeId)}?session=${encodeURIComponent(session)}`
    );
    return res.data;
  });
}

export async function quoteBulkDelivery(payload: {
  pickupAddress: DeliveryAddress;
  vehicleType: string;
  pricingTerms: BulkPricingTerms;
  drops: { dropoffAddress: DeliveryAddress; far?: boolean }[];
}): Promise<DataResult<BulkQuote>> {
  return fetchResult(async () => {
    const res = await authedFetch<SingleResponse<BulkQuote>>('/bulk-deliveries/quote', {
      method: 'POST',
      body: payload,
    });
    return res.data;
  });
}

export async function createBulkDelivery(
  payload: CreateBulkPayload
): Promise<DataResult<{ _id: string; bulkId: string; message: string }>> {
  const result = await fetchResult(async () => {
    const res = await authedFetch<SingleResponse<AdminBulkDelivery>>('/bulk-deliveries', {
      method: 'POST',
      body: payload,
    });
    // Says so when the bulk booked but its rider couldn't take it.
    return { _id: res.data._id, bulkId: res.data.bulkId, message: res.message };
  });
  if (result.ok) {
    revalidatePath('/bulk-deliveries');
    revalidatePath('/deliveries');
    revalidatePath('/forming-batches');
    revalidatePath('/batches', 'layout');
  }
  return result;
}

/** The vendor paid: settle the named postpaid drops, or all still owed. */
export async function settleBulkVendor(
  id: string,
  payload: { deliveryIds?: string[]; note?: string; method?: 'external' | 'wallet' }
): Promise<ActionResult> {
  const result = await runAction(() =>
    authedFetch(`/bulk-deliveries/${id}/settle`, { method: 'POST', body: payload })
  );
  if (result.ok) {
    revalidatePath('/bulk-deliveries');
    revalidatePath(`/bulk-deliveries/${id}`);
  }
  return result;
}

/** A flagged rider-account payment ops has refunded or applied. */
export async function resolveRiderCollectionCredit(
  accountId: string,
  reference: string
): Promise<ActionResult> {
  const result = await runAction(() =>
    authedFetch(
      `/bulk-deliveries/rider-collection-credits/${accountId}/${encodeURIComponent(reference)}/resolve`,
      { method: 'POST' }
    )
  );
  if (result.ok) revalidatePath('/bulk-receivables');
  return result;
}

export interface UpdateBulkDropPayload {
  receiver?: { name?: string; phone?: string };
  note?: string | null;
  dropoffAddress?: DeliveryAddress;
  payer?: BulkDropPayer;
  fee?: number;
  amountToCollect?: number;
  far?: boolean;
}

/** The API's own message says what changed, and when pricing would differ. */
async function patchBulk(id: string, path: string, body: unknown): Promise<DataResult<string>> {
  const result = await fetchResult(async () => {
    const res = await authedFetch<SingleResponse<AdminBulkDelivery>>(`/bulk-deliveries/${id}${path}`, {
      method: 'PATCH',
      body,
    });
    return res.message;
  });
  if (result.ok) {
    revalidatePath(`/bulk-deliveries/${id}`);
    revalidatePath('/deliveries');
    refresh();
  }
  return result;
}

/** Corrects the sender on the bulk and every drop still to be delivered. */
export async function updateBulkSender(
  id: string,
  sender: { name: string; phone: string }
): Promise<DataResult<string>> {
  return patchBulk(id, '/sender', { sender });
}

/** Corrects one drop before it is delivered, even with a rider on it. */
export async function updateBulkDrop(
  id: string,
  deliveryId: string,
  payload: UpdateBulkDropPayload
): Promise<DataResult<string>> {
  return patchBulk(id, `/drops/${deliveryId}`, payload);
}
