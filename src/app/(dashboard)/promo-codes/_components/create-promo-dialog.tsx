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
import { createPromoCode, PromoCodePayload } from '../actions';

const selectClass =
  'h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

export function CreatePromoDialog() {
  const [open, setOpen] = useState(false);
  const [discountType, setDiscountType] = useState<PromoCodePayload['discountType']>('percentage');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    const code = formData.get('code')?.toString().trim();
    const discountValue = Number(formData.get('discountValue'));
    if (!code || !discountValue) {
      setError('Code and discount value are required.');
      return;
    }

    const maxDiscountAmount = formData.get('maxDiscountAmount')?.toString();
    const expiryDate = formData.get('expiryDate')?.toString();
    const usageLimit = formData.get('usageLimit')?.toString();

    startTransition(async () => {
      try {
        await createPromoCode({
          code,
          discountType,
          discountValue,
          applicability: formData.get('applicability')?.toString() as PromoCodePayload['applicability'],
          maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : undefined,
          expiryDate: expiryDate || undefined,
          usageLimit: usageLimit ? Number(usageLimit) : undefined,
          description: formData.get('description')?.toString() || undefined,
        });
        setOpen(false);
        setDiscountType('percentage');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create promo code.');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <PlusIcon data-icon="inline-start" />
        Create promo code
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create promo code</DialogTitle>
          <DialogDescription>Set up a new discount campaign</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="code">Promo code</Label>
            <Input id="code" name="code" placeholder="e.g. WELCOME15" className="font-mono uppercase" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Discount type</Label>
            <div className="flex gap-2">
              {(['percentage', 'fixed'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setDiscountType(type)}
                  className={`flex-1 rounded-[10px] border px-2 py-2 text-xs font-semibold ${
                    discountType === type
                      ? 'border-primary bg-brand-tint2 text-primary'
                      : 'border-input text-muted-foreground'
                  }`}
                >
                  {type === 'percentage' ? 'Percentage' : 'Fixed amount'}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="discountValue">
                {discountType === 'percentage' ? 'Discount (%)' : 'Discount (₦)'}
              </Label>
              <Input id="discountValue" name="discountValue" type="number" step="any" min="0" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="maxDiscountAmount">Max discount (₦)</Label>
              <Input id="maxDiscountAmount" name="maxDiscountAmount" type="number" step="any" min="0" placeholder="Optional" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="usageLimit">Usage limit</Label>
              <Input id="usageLimit" name="usageLimit" type="number" min="0" placeholder="Unlimited" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="expiryDate">Expiry date</Label>
              <Input id="expiryDate" name="expiryDate" type="date" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="applicability">Applies to</Label>
            <select id="applicability" name="applicability" defaultValue="both" className={selectClass}>
              <option value="both">Product + delivery</option>
              <option value="product">Product only</option>
              <option value="delivery">Delivery only</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input id="description" name="description" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              Create code
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
