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
import { StaffRole } from '@/lib/permissions';
import { ROLE_LABELS } from '@/lib/staff-roles';
import { createStaff } from '../actions';

export function InviteMemberDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    const firstName = formData.get('firstName')?.toString().trim();
    const lastName = formData.get('lastName')?.toString().trim();
    const email = formData.get('email')?.toString().trim();
    const password = formData.get('password')?.toString();
    const role = formData.get('role')?.toString() as StaffRole;
    if (!firstName || !lastName || !email || !password || !role) {
      setError('All fields are required.');
      return;
    }

    startTransition(async () => {
      try {
        await createStaff({ firstName, lastName, email, password, role });
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add team member.');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <PlusIcon data-icon="inline-start" />
        Invite member
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add team member</DialogTitle>
          <DialogDescription>
            They&apos;ll be able to sign in immediately with the temporary password below.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" name="firstName" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" name="lastName" required />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" name="email" type="email" placeholder="name@awarome.com" required />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="password">Temporary password</Label>
              <Input id="password" name="password" type="password" minLength={8} required />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label>Role</Label>
              <div className="flex flex-wrap gap-1.5">
                {Object.values(StaffRole).map((role, i) => (
                  <label key={role} className="has-checked:border-primary has-checked:bg-brand-tint has-checked:text-primary flex flex-1 cursor-pointer items-center justify-center rounded-lg border border-input px-2.5 py-2 text-xs font-semibold whitespace-nowrap">
                    <input
                      type="radio"
                      name="role"
                      value={role}
                      defaultChecked={i === 0}
                      className="sr-only"
                    />
                    {ROLE_LABELS[role]}
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
              Add team member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
