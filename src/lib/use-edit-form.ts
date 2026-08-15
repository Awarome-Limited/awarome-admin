'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { ActionResult } from '@/lib/action-result';

/**
 * State for a record-edit form on a detail page.
 *
 * Two behaviours matter here, and both come from the same idea — **what the
 * form shows must be what the API actually stored**:
 *
 *  - Fields are controlled from local state, not `defaultValue`. React resets
 *    an uncontrolled form after a server action completes, so a save the API
 *    rejected would silently snap every field back to the old value with no
 *    explanation.
 *  - When the server sends a different record (the action calls `refresh()`
 *    after a successful save), local state is re-seeded from it. So after a
 *    save the inputs show the persisted values — including the case where the
 *    backend normalised or dropped something, which is worth seeing rather
 *    than being papered over by the text still sitting in the box.
 *
 * A failed save leaves the edits in place so they can be corrected and retried.
 */
export function useEditForm<T extends Record<string, unknown>>(
  record: T,
  save: (values: T) => Promise<ActionResult>,
  options: { successMessage: string; errorMessage: string }
) {
  const [values, setValues] = useState<T>(record);
  const [isPending, startTransition] = useTransition();

  // Re-seed during render when the incoming record changes — the pattern React
  // recommends over a useEffect, which would render one frame of stale values.
  const seed = JSON.stringify(record);
  const [lastSeed, setLastSeed] = useState(seed);
  if (seed !== lastSeed) {
    setLastSeed(seed);
    setValues(record);
  }

  const set = (patch: Partial<T>) =>
    setValues((prev) => ({ ...prev, ...patch }));

  const submit = (
    // Lets a caller shape the payload (trim, drop blanks, coerce numbers)
    // without the hook having to know the record's field semantics.
    toPayload: (values: T) => T = (v) => v
  ) => {
    startTransition(async () => {
      try {
        const result = await save(toPayload(values));
        if (result.ok) {
          toast.success(options.successMessage);
        } else {
          toast.error(result.error || options.errorMessage);
        }
      } catch (error) {
        // Only transport-level failures land here — the action reports API
        // errors as data so the message survives Next's production redaction.
        toast.error(
          error instanceof Error && error.message
            ? error.message
            : options.errorMessage
        );
      }
    });
  };

  return { values, set, submit, isPending };
}
