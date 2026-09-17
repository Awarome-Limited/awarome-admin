'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import type { ActionResult } from '@/lib/action-result';
import type { ContactsPayload } from '../../../actions';
import { ContactsInput, useContactsInput } from '../../../_components/contacts-input';

export function ReplaceContactsForm({
  action,
}: {
  action: (contacts: ContactsPayload) => Promise<ActionResult>;
}) {
  const [isPending, startTransition] = useTransition();
  const contacts = useContactsInput();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (contacts.count === 0) {
      toast.error('Add at least one phone number or email.');
      return;
    }

    const { phones, emails } = contacts.parsed;
    startTransition(async () => {
      const result = await action({ phones, emails });
      if (result.ok) {
        toast.success('Contacts replaced and users re-matched.');
        contacts.reset();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      <ContactsInput state={contacts} disabled={isPending} />
      <button
        type="submit"
        disabled={isPending || contacts.count === 0}
        className="self-start rounded-[10px] bg-primary px-[18px] py-[9px] text-[13px] font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
      >
        {isPending ? 'Replacing…' : 'Replace contacts'}
      </button>
    </form>
  );
}
