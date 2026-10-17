'use client';

import { Fragment, useRef, useState, useTransition, type ReactNode } from 'react';
import { toast } from 'sonner';
import { SaveBar } from '@/components/save-bar';

/**
 * A settings form that shows the floating save bar as soon as anything
 * changes, instead of a static Save button the user has to remember
 * (DESIGN.md §1.5). Fields stay uncontrolled: after a save the server
 * re-renders them with what was stored. `onChange` lets a page recalculate
 * its consequence panel live.
 */
export function SettingsForm({
  action,
  label,
  successMessage = 'Changes saved',
  children,
  className,
  onChange,
}: {
  action: (formData: FormData) => Promise<unknown>;
  label: string;
  successMessage?: string;
  children: ReactNode;
  className?: string;
  onChange?: (form: HTMLFormElement) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [dirty, setDirty] = useState(false);
  // Bumped on Discard to remount the fields, so client-side state inside them
  // (a selected radio card, a live preview) resets along with the inputs.
  const [resetKey, setResetKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  function save() {
    const form = formRef.current;
    if (!form) return;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    startTransition(async () => {
      try {
        const result = await action(data);
        // Actions that report errors as data ({ ok: false, error }) keep the edits.
        if (result && typeof result === 'object' && 'ok' in result && result.ok === false) {
          toast.error(('error' in result && typeof result.error === 'string' && result.error) || 'Couldn’t save.');
          return;
        }
        setDirty(false);
        toast.success(successMessage);
      } catch (error) {
        toast.error(error instanceof Error && error.message ? error.message : 'Couldn’t save.');
      }
    });
  }

  function discard() {
    formRef.current?.reset();
    setResetKey((k) => k + 1);
    setDirty(false);
    // After the remount, so the panel reads the restored values.
    requestAnimationFrame(() => {
      if (formRef.current) onChange?.(formRef.current);
    });
  }

  return (
    <form
      ref={formRef}
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      onInput={(event) => {
        setDirty(true);
        onChange?.(event.currentTarget);
      }}
      onChange={(event) => {
        setDirty(true);
        onChange?.(event.currentTarget);
      }}
    >
      <Fragment key={resetKey}>{children}</Fragment>
      <SaveBar dirty={dirty} saving={isPending} label={label} onDiscard={discard} onSave={save} />
    </form>
  );
}
