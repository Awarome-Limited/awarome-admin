'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { authedFetch, ApiError, PaginatedResponse } from '@/lib/api-client';
import { AdminUser } from '@/lib/types';
import type { ActionResult } from '@/lib/action-result';
import type { EmailPresetCategory } from '@/lib/email-presets';

export interface EmailRecipient {
  email: string;
  /** Used by the backend to resolve {{firstName}} per recipient. */
  firstName?: string;
  userId?: string;
}

export interface SendCustomerEmailPayload {
  recipients: EmailRecipient[];
  subject: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  presetId?: string;
}

export interface SendCustomerEmailData {
  queued: number;
  total: number;
  failed: { email: string; reason: string }[];
}

export type SendCustomerEmailResult =
  | ({ ok: true } & SendCustomerEmailData)
  | { ok: false; error: string };

export interface CustomerSuggestion {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  firstName?: string;
}

/**
 * Reports failures as data rather than throwing, for the same reason
 * `runAction` does: a thrown Server Action error is redacted to a generic
 * string in production, and the API's own message — "recipients must contain
 * at most 200 items" — is the part the sender actually needs to read.
 */
export async function sendCustomerEmail(
  payload: SendCustomerEmailPayload
): Promise<SendCustomerEmailResult> {
  try {
    const res = await authedFetch<{ data: SendCustomerEmailData }>(
      '/admins/customer-emails',
      { method: 'POST', body: payload }
    );
    return { ok: true, ...res.data };
  } catch (error) {
    unstable_rethrow(error);

    if (error instanceof ApiError) {
      return { ok: false, error: error.message };
    }
    console.error('Customer email send failed', error);
    return { ok: false, error: 'Something went wrong. Please try again.' };
  }
}

/** Type-ahead for the recipient picker. Only people we can actually mail. */
export async function searchCustomers(
  query: string
): Promise<CustomerSuggestion[]> {
  const search = query.trim();
  if (search.length < 2) return [];

  try {
    const res = await authedFetch<PaginatedResponse<AdminUser>>(
      `/users/admin?search=${encodeURIComponent(search)}&limit=8&skip=0`
    );

    return res.data
      .filter((user) => !!user.email)
      .map((user) => ({
        _id: user._id,
        name:
          [user.firstName, user.lastName].filter(Boolean).join(' ') ||
          user.email!,
        email: user.email!,
        phone: user.phone,
        firstName: user.firstName,
      }));
  } catch (error) {
    unstable_rethrow(error);
    // A failed lookup should narrow the picker to "no matches", not blow up
    // the composer and lose whatever has already been written.
    console.error('Customer search failed', error);
    return [];
  }
}

export interface SavedEmailTemplate {
  _id: string;
  name: string;
  category: EmailPresetCategory;
  summary?: string;
  subject: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmailTemplatePayload {
  name: string;
  category: EmailPresetCategory;
  summary?: string;
  subject: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

export type TemplateResult =
  | { ok: true; template: SavedEmailTemplate }
  | { ok: false; error: string };

function templateError(error: unknown, fallback: string): { ok: false; error: string } {
  unstable_rethrow(error);
  if (error instanceof ApiError) return { ok: false, error: error.message };
  console.error(fallback, error);
  return { ok: false, error: 'Something went wrong. Please try again.' };
}

export async function getEmailTemplates(): Promise<SavedEmailTemplate[]> {
  try {
    const res = await authedFetch<{ data: SavedEmailTemplate[] }>(
      '/admins/email-templates'
    );
    return res.data ?? [];
  } catch (error) {
    unstable_rethrow(error);
    // Saved templates are an addition to the built-in ones, not a prerequisite:
    // losing them must still leave a working composer.
    console.error('Email template fetch failed', error);
    return [];
  }
}

export async function createEmailTemplate(
  payload: EmailTemplatePayload
): Promise<TemplateResult> {
  try {
    const res = await authedFetch<{ data: SavedEmailTemplate }>(
      '/admins/email-templates',
      { method: 'POST', body: payload }
    );
    revalidatePath('/customer-emails');
    return { ok: true, template: res.data };
  } catch (error) {
    return templateError(error, 'Email template create failed');
  }
}

export async function updateEmailTemplate(
  id: string,
  payload: Partial<EmailTemplatePayload>
): Promise<TemplateResult> {
  try {
    const res = await authedFetch<{ data: SavedEmailTemplate }>(
      `/admins/email-templates/${id}`,
      { method: 'PATCH', body: payload }
    );
    revalidatePath('/customer-emails');
    return { ok: true, template: res.data };
  } catch (error) {
    return templateError(error, 'Email template update failed');
  }
}

export async function deleteEmailTemplate(id: string): Promise<ActionResult> {
  try {
    await authedFetch(`/admins/email-templates/${id}`, { method: 'DELETE' });
    revalidatePath('/customer-emails');
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ApiError) return { ok: false, error: error.message };
    console.error('Email template delete failed', error);
    return { ok: false, error: 'Something went wrong. Please try again.' };
  }
}
