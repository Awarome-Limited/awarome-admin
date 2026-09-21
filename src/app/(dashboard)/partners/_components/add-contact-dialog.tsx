'use client';

import { useState, useTransition } from 'react';
import { PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { createPartnerContact } from '../actions';

const ROLES = [
  { value: 'owner', label: 'Owner' },
  { value: 'developer', label: 'Developer' },
  { value: 'viewer', label: 'Viewer' },
] as const;

export function AddContactDialog({ partnerId }: { partnerId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    const email = formData.get('email')?.toString().trim();
    if (!email) {
      setError('An email address is required.');
      return;
    }

    startTransition(async () => {
      try {
        await createPartnerContact(partnerId, {
          firstName: formData.get('firstName')?.toString().trim() || undefined,
          lastName: formData.get('lastName')?.toString().trim() || undefined,
          email,
          phone: formData.get('phone')?.toString().trim() || undefined,
          role: (formData.get('role')?.toString() || 'owner') as 'owner',
        });
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add the contact.');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <PlusIcon data-icon="inline-start" />
        Add contact
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a partner contact</DialogTitle>
          <DialogDescription>
            Who to reach at the partner. This is a contact record, not a login — the API
            is accessed with keys, and there is no partner console yet.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" name="firstName" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" name="lastName" />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label>Role</Label>
              <div className="flex flex-wrap gap-1.5">
                {ROLES.map((role, i) => (
                  <label
                    key={role.value}
                    className="has-checked:border-primary has-checked:bg-brand-tint has-checked:text-primary flex flex-1 cursor-pointer items-center justify-center rounded-lg border border-input px-2.5 py-2 text-xs font-semibold"
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role.value}
                      defaultChecked={i === 0}
                      className="sr-only"
                    />
                    {role.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Adding…' : 'Add contact'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
