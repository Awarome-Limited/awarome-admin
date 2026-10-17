'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import type { ActionResult } from '@/lib/action-result';
import type { ContactsPayload } from '../../../actions';
import { ContactsInput, useContactsInput } from '../../../_components/contacts-input';
import { Button } from '@/components/ui/button';

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
      <Button
        type="submit"
        loading={isPending}
        disabled={isPending || contacts.count === 0}
        className="self-start"
      >
        {isPending ? 'Replacing…' : 'Replace contacts'}
      </Button>
    </form>
  );
}
