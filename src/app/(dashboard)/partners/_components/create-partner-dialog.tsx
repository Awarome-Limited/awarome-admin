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
import { createPartner } from '../actions';

export function CreatePartnerDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    const name = formData.get('name')?.toString().trim();
    const email = formData.get('email')?.toString().trim();
    const phone = formData.get('phone')?.toString().trim();
    const address = formData.get('address')?.toString().trim();
    const state = formData.get('state')?.toString().trim();
    const lat = Number(formData.get('lat'));
    const long = Number(formData.get('long'));

    if (!name || !email || !phone) {
      setError('Name, email and phone are required.');
      return;
    }
    // The partner record carries a geospatial index, so it needs real
    // coordinates — without them the insert is rejected outright.
    if (!Number.isFinite(lat) || !Number.isFinite(long) || (lat === 0 && long === 0)) {
      setError('Enter the coordinates of the partner’s address.');
      return;
    }

    startTransition(async () => {
      try {
        await createPartner({
          name,
          email,
          phone,
          address: address || undefined,
          state: state || undefined,
          country: 'Nigeria',
          location: { lat, long },
        });
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create the partner.');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <PlusIcon data-icon="inline-start" />
        Add partner
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add an API partner</DialogTitle>
          <DialogDescription>
            This creates the account and its wallet. The API stays switched off and the
            wallet empty until you enable access and fund it.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="name">Business name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" required />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" name="state" placeholder="Lagos" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="lat">Latitude</Label>
              <Input id="lat" name="lat" type="number" step="any" placeholder="6.4412" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="long">Longitude</Label>
              <Input id="long" name="long" type="number" step="any" placeholder="3.4726" required />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creating…' : 'Add partner'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
