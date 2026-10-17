'use client';

import { useState, useTransition } from 'react';
import { PlusIcon } from 'lucide-react';
import { toast } from 'sonner';
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
import type { BusinessRole } from '@/lib/types';
import { inviteBusinessMember } from '../actions';

const ROLES: { value: BusinessRole; label: string }[] = [
  { value: 'owner', label: 'Owner (only if they have none)' },
  { value: 'admin', label: 'Admin' },
  { value: 'dispatcher', label: 'Dispatcher' },
  { value: 'finance', label: 'Finance' },
];

export function AddMemberDialog({ businessId, hasOwner }: { businessId: string; hasOwner: boolean }) {
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
      const result = await inviteBusinessMember(businessId, {
        email,
        name: formData.get('name')?.toString().trim() || undefined,
        role: (formData.get('role')?.toString() || 'dispatcher') as BusinessRole,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(`Invite sent to ${email}`);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <PlusIcon data-icon="inline-start" />
        Invite member
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a team member</DialogTitle>
          <DialogDescription>They get an email link to set their password. It expires in 72 hours.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="member-name">Name</Label>
            <Input id="member-name" name="name" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="member-email">Work email</Label>
            <Input id="member-email" name="email" type="email" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="member-role">Role</Label>
            <select
              id="member-role"
              name="role"
              defaultValue={hasOwner ? 'dispatcher' : 'owner'}
              className="field pr-9"
            >
              {ROLES.filter((r) => r.value !== 'owner' || !hasOwner).map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Sending…' : 'Send invite'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
