import 'server-only';

import { unstable_rethrow } from 'next/navigation';
import { ApiError } from '@/lib/api-client';

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Runs a mutation and reports the outcome as data instead of an exception.
 *
 * An error thrown out of a Server Action is redacted to a generic string
 * before it reaches the browser in production, so the useful part — the API's
 * own validation message — never reaches the person who needs it. Worse, an
 * uncaught one on a page with no error boundary replaces the whole screen with
 * Next's built-in "This page couldn't load" 500.
 *
 * Returning the message keeps the page mounted and the edits intact.
 */
export async function runAction(
  mutate: () => Promise<unknown>
): Promise<ActionResult> {
  try {
    await mutate();
    return { ok: true };
  } catch (error) {
    // redirect()/notFound() signal control flow by throwing — never swallow.
    unstable_rethrow(error);

    if (error instanceof ApiError) {
      return { ok: false, error: error.message };
    }
    console.error('Server action failed', error);
    return { ok: false, error: 'Something went wrong. Please try again.' };
  }
}
