'use client';

import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { PencilIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { BulkDeliveryDrop, BulkDropPayer, BulkPricingTerms, DeliveryAddress } from '@/lib/types';
import {
  quoteBulkDelivery,
  updateBulkDrop,
  updateBulkSender,
  type UpdateBulkDropPayload,
} from '../../actions';
import { AddressInput } from '../../_components/address-input';

const inputClass =
  'h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive';

/** The API's reply says what changed; a pricing note in it deserves longer. */
function announce(message: string) {
  if (message.includes('tariff would be')) toast.warning(message, { duration: 10000 });
  else toast.success(message);
}

export function EditSenderDialog({
  bulkId,
  sender,
}: {
  bulkId: string;
  sender?: { name?: string; phone?: string };
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(sender?.name ?? '');
  const [phone, setPhone] = useState(sender?.phone ?? '');
  const [isPending, startTransition] = useTransition();

  const reset = (next: boolean) => {
    if (next) {
      setName(sender?.name ?? '');
      setPhone(sender?.phone ?? '');
    }
    setOpen(next);
  };

  function save() {
    startTransition(async () => {
      const result = await updateBulkSender(bulkId, { name: name.trim(), phone: phone.trim() });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      announce(result.data);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger render={<Button size="sm" variant="ghost" />}>
        <PencilIcon data-icon="inline-start" />
        Edit
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit sender</DialogTitle>
          <DialogDescription>
            Updates the bulk and every drop not yet delivered. Riders call this number at the pickup.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-sender-name">Name</Label>
            <input id="edit-sender-name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-sender-phone">Phone</Label>
            <input
              id="edit-sender-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              className={inputClass}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={save} disabled={isPending || !name.trim() || !phone.trim()}>
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** What the dialog needs from the bulk to price a drop the way booking did. */
export interface BulkPricingContext {
  pickupAddress?: DeliveryAddress;
  vehicleType: string;
  pricingMode: 'flat' | 'standard';
  terms: BulkPricingTerms;
}

const naira = (amount: number) => `₦${Math.round(amount).toLocaleString('en-NG')}`;

/** Mirrors the API: once money has moved on a drop, its price is fixed. */
function priceLocked(drop: BulkDeliveryDrop) {
  const pod = drop.payOnDelivery ?? {};
  return (
    !!drop.isPaid ||
    !['pending', 'awaiting-payment'].includes(pod.status ?? 'pending') ||
    (pod.amountReceived ?? 0) > 0
  );
}

export function EditDropDialog({
  bulkId,
  drop,
  pricing,
}: {
  bulkId: string;
  drop: BulkDeliveryDrop;
  pricing: BulkPricingContext;
}) {
  const initialPayer: BulkDropPayer = drop.payOnDelivery?.postpaid ? 'vendor' : 'receiver';
  const initialListed = drop.bulkPricing?.listedFee ?? drop.deliveryFee ?? 0;
  const initialCollect = initialPayer === 'receiver' ? String(drop.payOnDelivery?.amountDue ?? drop.deliveryFee ?? '') : '';
  const locked = priceLocked(drop);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [address, setAddress] = useState<DeliveryAddress | null>(null);
  const [query, setQuery] = useState('');
  const [payer, setPayer] = useState<BulkDropPayer>(initialPayer);
  /** '' means "use the tariff", as at booking. */
  const [feeOverride, setFeeOverride] = useState('');
  const [collect, setCollect] = useState('');
  const [farOverride, setFarOverride] = useState<boolean | null>(null);
  /** Off by default: corrections leave the booked price alone unless asked. */
  const [updateFee, setUpdateFee] = useState(false);
  const [quote, setQuote] = useState<{ distanceKm: number; standardFee: number; far: boolean } | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [isQuoting, startQuote] = useTransition();
  const [isPending, startTransition] = useTransition();
  const quoteTicket = useRef(0);
  const hasRider = !!drop.rider;

  const old = drop.dropoffAddress?.location;
  const moved = !!address && (address.location.lat !== old?.lat || address.location.long !== old?.long);
  const flat = pricing.pricingMode === 'flat';

  // A drop that hasn't moved keeps the far flag it was booked with.
  const far = farOverride ?? (moved && quote ? quote.far : !!drop.bulkPricing?.far);
  const tariff = flat ? (far ? pricing.terms.farRate : pricing.terms.flatRate) : quote?.standardFee;
  const fee = feeOverride !== '' ? Number(feeOverride) : tariff;
  const collected = payer === 'receiver' ? (collect !== '' ? Number(collect) : fee) : undefined;

  const repricing = !locked && updateFee;
  const pricingDirty =
    moved ||
    payer !== initialPayer ||
    feeOverride !== String(initialListed) ||
    collect !== initialCollect ||
    farOverride !== null;

  function requote(target: DeliveryAddress | null) {
    if (!target || !pricing.pickupAddress) return;
    const ticket = ++quoteTicket.current;
    startQuote(async () => {
      const result = await quoteBulkDelivery({
        pickupAddress: pricing.pickupAddress!,
        vehicleType: pricing.vehicleType,
        pricingTerms: pricing.terms,
        drops: [{ dropoffAddress: target }],
      });
      if (ticket !== quoteTicket.current) return;
      if (!result.ok) {
        setQuoteError(result.error);
        setQuote(null);
        return;
      }
      setQuoteError(null);
      setQuote(result.data.drops[0]);
    });
  }

  const reset = (next: boolean) => {
    if (next) {
      setName(drop.receiver?.name ?? '');
      setPhone(drop.receiver?.phone ?? '');
      setNote(drop.note ?? '');
      setAddress(drop.dropoffAddress ?? null);
      setQuery(drop.dropoffAddress?.address ?? '');
      setPayer(initialPayer);
      setFeeOverride(String(initialListed));
      setCollect(initialCollect);
      setFarOverride(null);
      setUpdateFee(false);
      setQuote(null);
      setQuoteError(null);
      requote(drop.dropoffAddress ?? null);
    }
    setOpen(next);
  };

  const typedButUnpicked = !address && query.trim().length > 0;
  const stillPricing = repricing && pricingDirty && (fee == null || Number.isNaN(fee));
  const collectsNothing = repricing && payer === 'receiver' && !(Number(collected) > 0);
  // What the new address would cost, for the hint while the fee is kept.
  const tariffDiffers = moved && tariff != null && tariff !== initialListed;

  function toggleUpdateFee(on: boolean) {
    setUpdateFee(on);
    // Ticked after a move: start from the new tariff, as booking would.
    if (on && moved && feeOverride === String(initialListed)) setFeeOverride('');
  }

  function save() {
    const payload: UpdateBulkDropPayload = {
      receiver: { name: name.trim(), phone: phone.trim() },
      note: note.trim() || null,
    };
    if (moved) payload.dropoffAddress = address!;
    if (repricing && pricingDirty) {
      payload.payer = payer;
      payload.fee = Math.round(fee ?? 0);
      payload.far = far;
      if (payer === 'receiver') payload.amountToCollect = Math.round(collected ?? 0);
    }
    startTransition(async () => {
      const result = await updateBulkDrop(bulkId, drop._id, payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      announce(result.data);
      setOpen(false);
    });
  }

  const before = drop.payOnDelivery?.amountDue ?? drop.deliveryFee ?? 0;
  const after = payer === 'receiver' ? collected : fee;

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label={`Edit drop for ${drop.receiver?.name ?? drop.deliveryId}`}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          />
        }
      >
        <PencilIcon className="size-4" />
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-32px)] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Edit drop</DialogTitle>
          <DialogDescription>
            {drop.deliveryId}
            {hasRider ? ' · The rider is told straight away if the address, phone or amount to collect changes.' : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3.5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-drop-name">Receiver name</Label>
              <input id="edit-drop-name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-drop-phone">Receiver phone</Label>
              <input
                id="edit-drop-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Drop-off address</Label>
            <AddressInput
              value={address}
              query={query}
              onChange={(next, text) => {
                setAddress(next);
                setQuery(text);
                if (next) {
                  // With the fee being updated, a new address re-prices like
                  // booking, unless ops typed a fee of their own.
                  if (updateFee && feeOverride === String(initialListed)) setFeeOverride('');
                  setFarOverride(null);
                  requote(next);
                }
              }}
              placeholder="Search for the new address"
            />
            <span className={cn('text-[12px]', typedButUnpicked ? 'text-warning' : 'text-muted-foreground')}>
              {typedButUnpicked
                ? 'Pick a suggestion so the rider gets an exact pin.'
                : quoteError
                  ? <span className="text-destructive">{quoteError}</span>
                  : isQuoting
                    ? 'Working out the distance…'
                    : quote
                      ? `${quote.distanceKm} km from the pickup by road`
                      : ''}
            </span>
          </div>

          <div className="flex flex-col gap-3 rounded-[12px] border border-border p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-foreground">Price</span>
                {repricing && after != null && !Number.isNaN(after) && after !== before && (
                  <span className="text-[12px] tabular-nums text-muted-foreground">
                    {naira(before)} → <span className="font-semibold text-foreground">{naira(after)}</span>
                  </span>
                )}
              </span>
              {!locked && (
                <label className="flex items-center gap-2 text-[12.5px] font-medium text-foreground">
                  <Switch checked={updateFee} onCheckedChange={toggleUpdateFee} />
                  Update the fee
                </label>
              )}
            </div>
            {!repricing ? (
              <div className="flex flex-col gap-2 rounded-[10px] bg-muted px-3 py-2 text-[12.5px] text-foreground-secondary">
                <span>
                  <span className="font-semibold text-foreground tabular-nums">{naira(before)}</span>,{' '}
                  {initialPayer === 'vendor' ? 'vendor pays after delivery' : 'receiver pays at the door'}.{' '}
                  {locked
                    ? 'Money has already been received for this drop, so its price is locked.'
                    : 'Stays as booked.'}
                </span>
                {!locked && tariffDiffers && (
                  <span className="text-warning">
                    At the new address the tariff is {naira(tariff!)}. Turn on “Update the fee” to charge it.
                  </span>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <Label>Who pays</Label>
                    <div className="flex h-9 rounded-lg border border-input p-0.5">
                      {(['vendor', 'receiver'] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPayer(p)}
                          className={cn(
                            'flex-1 rounded-md text-[12.5px] font-semibold',
                            payer === p ? 'bg-brand-tint text-primary' : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {p === 'vendor' ? 'Vendor' : 'Receiver'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="edit-drop-fee">Fee (₦)</Label>
                    <input
                      id="edit-drop-fee"
                      type="number"
                      min={0}
                      value={feeOverride}
                      onChange={(e) => setFeeOverride(e.target.value)}
                      placeholder={tariff != null ? String(tariff) : '…'}
                      className={cn(inputClass, 'tabular-nums')}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="edit-drop-collect">Rider collects</Label>
                    {payer === 'receiver' ? (
                      <input
                        id="edit-drop-collect"
                        type="number"
                        min={0}
                        value={collect}
                        onChange={(e) => setCollect(e.target.value)}
                        placeholder={fee != null && !Number.isNaN(fee) ? String(fee) : '…'}
                        aria-invalid={collectsNothing && collect !== ''}
                        className={cn(inputClass, 'tabular-nums')}
                      />
                    ) : (
                      <span className="flex h-9 items-center px-1 text-[12.5px] text-muted-foreground">
                        Nothing — vendor pays after
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted-foreground">
                  <span>
                    {tariff != null
                      ? `Tariff here: ${naira(tariff)}${flat ? (far ? ' (far rate)' : ' (flat rate)') : ' (normal pricing)'}`
                      : 'Working out the tariff…'}
                    {feeOverride !== '' && tariff != null && Number(feeOverride) !== tariff && (
                      <button
                        type="button"
                        onClick={() => setFeeOverride('')}
                        className="ml-2 font-semibold text-primary hover:underline"
                      >
                        Use tariff
                      </button>
                    )}
                  </span>
                  {flat && (
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={far}
                        onChange={(e) => setFarOverride(e.target.checked)}
                        className="size-4 accent-[var(--primary)]"
                      />
                      Far rate
                    </label>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-drop-note">Note for the rider</Label>
            <input
              id="edit-drop-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional"
              className={inputClass}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={
              isPending ||
              !name.trim() ||
              !phone.trim() ||
              typedButUnpicked ||
              stillPricing ||
              collectsNothing ||
              (moved && isQuoting)
            }
          >
            {isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
