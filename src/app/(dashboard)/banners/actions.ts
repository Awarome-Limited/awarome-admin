'use server';

import { revalidatePath } from 'next/cache';
import { authedFetch, authedUpload } from '@/lib/api-client';
import type {
  WebBannerCtaVariant,
  WebBannerLinkType,
  WebBannerMode,
  WebBannerTheme,
} from '@/lib/types';

export interface WebBannerPayload {
  mode?: WebBannerMode;
  eyebrow?: string;
  headline?: string;
  subheadline?: string;
  ctaLabel?: string;
  ctaVariant?: WebBannerCtaVariant;
  theme?: WebBannerTheme;
  backgroundColor?: string;
  textColor?: string;
  imageUrl?: string;
  imageAlt?: string;
  linkType?: WebBannerLinkType;
  linkValue?: string;
  sortOrder?: number;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

export async function createWebBanner(payload: WebBannerPayload) {
  await authedFetch('/web-banners', { method: 'POST', body: payload });
  revalidatePath('/banners');
}

export async function updateWebBanner(id: string, payload: WebBannerPayload) {
  await authedFetch(`/web-banners/${id}`, { method: 'PATCH', body: payload });
  revalidatePath('/banners');
}

export async function toggleWebBannerActive(id: string, isActive: boolean) {
  await authedFetch(`/web-banners/${id}`, {
    method: 'PATCH',
    body: { isActive },
  });
  revalidatePath('/banners');
}

export async function deleteWebBanner(id: string) {
  await authedFetch(`/web-banners/${id}`, { method: 'DELETE' });
  revalidatePath('/banners');
}

export async function reorderWebBanners(ids: string[]) {
  await authedFetch('/web-banners/reorder', {
    method: 'PATCH',
    body: { ids },
  });
  revalidatePath('/banners');
}

export async function createMobileAd(payload: {
  vendor: string;
  bannerImage: string;
}) {
  await authedFetch('/ads', { method: 'POST', body: payload });
  revalidatePath('/banners');
}

export async function deleteMobileAd(id: string) {
  await authedFetch(`/ads/${id}`, { method: 'DELETE' });
  revalidatePath('/banners');
}

/**
 * Pushes the file to the backend, which stores it on Cloudinary and returns
 * the secure URL as `data`. The URL is then saved on the banner itself.
 */
export async function uploadBannerImage(formData: FormData): Promise<string> {
  const file = formData.get('upload');
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Choose an image to upload');
  }

  const forwarded = new FormData();
  forwarded.append('upload', file, file.name);

  const res = await authedUpload<{ data: string }>(
    '/uploads/banners/web',
    forwarded
  );

  if (!res?.data) {
    throw new Error('Upload succeeded but no image URL came back');
  }

  return res.data;
}
