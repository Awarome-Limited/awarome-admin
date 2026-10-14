'use server';

import { refresh, revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { ApiError, authedFetch, SingleResponse } from '@/lib/api-client';
import { runAction, type ActionResult } from '@/lib/action-result';
import type {
  BusinessAddress,
  BusinessFeeMode,
  BusinessRole,
  DeliveryAddress,
} from '@/lib/types';
import type { PlaceSuggestion } from '../bulk-deliveries/actions';

type DataResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function fetchResult<T>(load: () => Promise<T>): Promise<DataResult<T>> {
  try {
    return { ok: true, data: await load() };
  } catch (error) {
    unstable_rethrow(error);
    return {
      ok: false,
      error: error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
    };
  }
}

/** The picker shows a DeliveryAddress; a business keeps the Google place id too. */
export type PickedAddress = DeliveryAddress & { placeId: string };

const toPicked = (a: BusinessAddress): PickedAddress => ({
  address: a.text,
  location: { lat: a.lat, long: a.lng },
  placeId: a.placeId,
  state: a.state,
  lga: a.lga,
  district: a.district,
  country: a.country,
});

export async function searchBusinessPlaces(query: string, session: string) {
  return fetchResult(async () => {
    const res = await authedFetch<SingleResponse<PlaceSuggestion[]>>(
      `/admins/businesses/places?q=${encodeURIComponent(query)}&session=${encodeURIComponent(session)}`
    );
    return res.data;
  });
}

export async function getBusinessPlace(placeId: string, session: string) {
  return fetchResult(async () => {
    const res = await authedFetch<SingleResponse<BusinessAddress>>(
      `/admins/businesses/places/${encodeURIComponent(placeId)}?session=${encodeURIComponent(session)}`
    );
    return toPicked(res.data);
  });
}

const fromPicked = (a: PickedAddress): BusinessAddress => ({
  text: a.address,
  lat: a.location.lat,
  lng: a.location.long,
  placeId: a.placeId,
  state: a.state,
  lga: a.lga,
  district: a.district,
  country: a.country,
});

export interface CreateBusinessPayload {
  name: string;
  pickupPhone: string;
  pickupAddress: PickedAddress;
  defaultFeeMode: BusinessFeeMode;
  owner: { name?: string; email: string; phone?: string };
}

export async function createBusiness(
  payload: CreateBusinessPayload
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  let id = '';
  const result = await runAction(async () => {
    const res = await authedFetch<SingleResponse<{ id: string }>>('/admins/businesses', {
      method: 'POST',
      body: { ...payload, pickupAddress: fromPicked(payload.pickupAddress) },
    });
    id = res.data.id;
    revalidatePath('/businesses');
  });
  return result.ok ? { ok: true, id } : result;
}

export async function setBusinessSuspended(id: string, suspended: boolean) {
  await authedFetch(`/admins/businesses/${id}`, {
    method: 'PATCH',
    body: { status: suspended ? 'suspended' : 'active' },
  });
  revalidatePath('/businesses');
  revalidatePath(`/businesses/${id}`);
}

export async function updateBusiness(
  id: string,
  payload: {
    name?: string;
    pickupPhone?: string;
    pickupAddress?: PickedAddress;
    defaultFeeMode?: BusinessFeeMode;
  }
): Promise<ActionResult> {
  return runAction(async () => {
    await authedFetch(`/admins/businesses/${id}`, {
      method: 'PATCH',
      body: {
        ...payload,
        ...(payload.pickupAddress ? { pickupAddress: fromPicked(payload.pickupAddress) } : {}),
      },
    });
    revalidatePath(`/businesses/${id}`);
    refresh();
  });
}

export async function inviteBusinessMember(
  id: string,
  payload: { email: string; name?: string; role: BusinessRole }
): Promise<ActionResult> {
  return runAction(async () => {
    await authedFetch(`/admins/businesses/${id}/members`, { method: 'POST', body: payload });
    revalidatePath(`/businesses/${id}`);
    refresh();
  });
}

export async function resendBusinessInvite(id: string, memberId: string): Promise<ActionResult> {
  return runAction(async () => {
    await authedFetch(`/admins/businesses/${id}/members/${memberId}/resend-invite`, { method: 'POST' });
  });
}
