'use client';

import { useRouter } from 'next/navigation';
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
import type { BusinessFeeMode } from '@/lib/types';
import { AddressInput } from '../../bulk-deliveries/_components/address-input';
import {
  createBusiness,
  getBusinessPlace,
  searchBusinessPlaces,
  type PickedAddress,
} from '../actions';
import { startNavigationProgress } from '@/components/navigation-progress';

/**
 * Onboards a logistics business: its warehouse (the pickup for every
 * delivery) and its owner, who gets an email to set a password.
 */
export function CreateBusinessDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickup, setPickup] = useState<PickedAddress | null>(null);
  const [feeMode, setFeeMode] = useState<BusinessFeeMode>('inclusive');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    const text = (key: string) => formData.get(key)?.toString().trim() ?? '';
    const name = text('name');
    const pickupPhone = text('pickupPhone');
    const ownerEmail = text('ownerEmail');
    if (!name || !pickupPhone || !ownerEmail) {
      setError('Business name, pickup phone and owner email are required.');
      return;
    }
    if (!pickup) {
      setError('Pick the warehouse address from the suggestions so riders get an exact pin.');
      return;
    }
    startTransition(async () => {
      const result = await createBusiness({
        name,
        pickupPhone,
        pickupAddress: pickup,
        defaultFeeMode: feeMode,
        owner: {
          name: text('ownerName') || undefined,
          email: ownerEmail,
          phone: text('ownerPhone') || undefined,
        },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setPickup(null);
      startNavigationProgress();
      router.push(`/businesses/${result.id}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <PlusIcon data-icon="inline-start" />
        Onboard business
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Onboard a business</DialogTitle>
          <DialogDescription>
            Creates the business and emails the owner a link (valid 72 hours) to set their
            password at business.awarome.com.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="name">Business name</Label>
              <Input id="name" name="name" required placeholder="As the business is known" />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label>Warehouse (pickup) address</Label>
              <AddressInput<PickedAddress>
                value={pickup}
                onChange={(address) => setPickup(address)}
                search={searchBusinessPlaces}
                resolve={getBusinessPlace}
                placeholder="Search for the warehouse address…"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pickupPhone">Pickup contact phone</Label>
              <Input id="pickupPhone" name="pickupPhone" required placeholder="0803 000 0000" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="feeMode">Delivery fee default</Label>
              <select
                id="feeMode"
                value={feeMode}
                onChange={(e) => setFeeMode(e.target.value as BusinessFeeMode)}
                className="field pr-9"
              >
                <option value="inclusive">Included in the amount collected</option>
                <option value="added">Added on top of the item price</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ownerName">Owner name</Label>
              <Input id="ownerName" name="ownerName" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ownerPhone">Owner phone</Label>
              <Input id="ownerPhone" name="ownerPhone" />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="ownerEmail">Owner work email</Label>
              <Input id="ownerEmail" name="ownerEmail" type="email" required />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button loading={isPending} type="submit" disabled={isPending}>
              {isPending ? 'Creating…' : 'Create and invite owner'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
