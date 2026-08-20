'use server';

import { unstable_rethrow } from 'next/navigation';
import { authedFetch, ApiError, PaginatedResponse } from '@/lib/api-client';
import { AdminUser } from '@/lib/types';

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
