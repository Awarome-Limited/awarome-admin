'use client';

import { useState } from 'react';
import { BatchPricingModel, PricingConfig } from '@/lib/types';

/**
 * Mirrors the server's `flatDiscountBatchFee` so the preview below matches what
 * customers will actually be charged. Round up to the nearest ₦100, then hold
 * the result at least ₦100 under instant — batch must never be the dearer
 * option, which a very small discount would otherwise produce.
 */
function previewBatchFee(instantFee: number, discountPercent: number): number {
  const pct = Number.isFinite(discountPercent)
    ? Math.min(Math.max(discountPercent, 0), 90)
    : 0;
  const fee = Math.ceil((instantFee * (1 - pct / 100)) / 100) * 100;
  return Math.max(Math.min(fee, instantFee - 100), 0);
}

// Representative instant fees, so an admin can see the effect of the dial
// across a short, mid and long trip before saving.
const PREVIEW_FEES = [2400, 4500, 7000];

const MODELS: {
  value: BatchPricingModel;
  title: string;
  description: string;
}[] = [
  {
    value: 'window',
    title: 'Delivery windows',
    description:
      'Customers book one of four time slots. The 4PM–8PM slot is priced at a per-vehicle floor and earlier slots scale up toward the instant fee. Batches form when each slot closes.',
  },
  {
    value: 'flat-discount',
    title: 'Flat discount',
    description:
      'No time slots. Batch is a single price, a flat percentage off instant. Batches form once enough nearby drops have accumulated.',
  },
];

const fieldClass =
  'w-full border-none bg-transparent text-[14px] font-semibold tabular-nums text-foreground outline-none';
const fieldWrapClass =
  'flex items-center gap-2 rounded-[10px] border border-input bg-muted px-[13px] py-[10px]';

export function BatchPricingModelSection({ config }: { config: PricingConfig }) {
  const [model, setModel] = useState<BatchPricingModel>(
    config.batchPricingModel ?? 'window'
  );
  const [discount, setDiscount] = useState<number>(
    config.batchFlatDiscountPercent ?? 35
  );

  const isWindow = model === 'window';

  return (
    <div className="rounded-[14px] border border-border bg-card p-[22px_24px] shadow-[var(--shadow-card)]">
      <div className="text-[15px] font-semibold text-foreground">
        Batch delivery pricing
      </div>
      <div className="mb-[18px] mt-1 text-[13px] text-muted-foreground">
        How batch delivery is priced, and whether customers pick a delivery
        window. Switching models changes the apps too — they read the live model
        and render the matching checkout.
      </div>

      <div className="flex flex-col gap-3">
        {MODELS.map((option) => {
          const selected = model === option.value;
          return (
            <label
              key={option.value}
              className={`flex cursor-pointer gap-3 rounded-[12px] border p-[14px_16px] transition-colors ${
                selected
                  ? 'border-ring bg-muted/60'
                  : 'border-border bg-muted/20 hover:bg-muted/40'
              }`}
            >
              <input
                type="radio"
                name="batchPricingModel"
                value={option.value}
                checked={selected}
                onChange={() => setModel(option.value)}
                className="mt-[3px] size-4 shrink-0 accent-[var(--color-primary,currentColor)]"
              />
              <span className="flex flex-col gap-1">
                <span className="text-[13.5px] font-semibold text-foreground">
                  {option.title}
                </span>
                <span className="text-[12.5px] leading-[1.5] text-muted-foreground">
                  {option.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      {isWindow ? (
        <div className="mt-[22px]">
          <div className="text-[13.5px] font-semibold text-foreground">
            Window floors
          </div>
          <div className="mb-[14px] mt-1 text-[12.5px] text-muted-foreground">
            The 4PM–8PM price per vehicle. Earlier windows scale up toward the
            instant fee. Keep these below the minimum delivery charge.
          </div>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
            {[
              { label: 'Flat floor — bike', name: 'batchFlatFeeBike', value: config.batchFlatFeeBike },
              { label: 'Flat floor — car', name: 'batchFlatFeeCar', value: config.batchFlatFeeCar },
              { label: 'Flat floor — truck', name: 'batchFlatFeeTruck', value: config.batchFlatFeeTruck },
            ].map((field) => (
              <div key={field.name} className="flex flex-col gap-[7px]">
                <span className="text-[13px] font-medium text-foreground-secondary">
                  {field.label}
                </span>
                <div className={fieldWrapClass}>
                  <span className="text-[13px] font-semibold text-muted-foreground">
                    ₦
                  </span>
                  <input
                    id={field.name}
                    name={field.name}
                    type="number"
                    step="any"
                    min={0}
                    defaultValue={field.value}
                    className={fieldClass}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-[22px]">
          <div className="text-[13.5px] font-semibold text-foreground">
            Discount off instant
          </div>
          <div className="mb-[14px] mt-1 text-[12.5px] text-muted-foreground">
            Applied to every batch quote. Because it is a percentage of the
            instant fee, longer trips still cost more — unlike the window floor,
            which prices every distance the same in the cheapest slot.
          </div>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
            <div className="flex flex-col gap-[7px]">
              <span className="text-[13px] font-medium text-foreground-secondary">
                Batch discount
              </span>
              <div className={fieldWrapClass}>
                <span className="text-[13px] font-semibold text-muted-foreground">
                  %
                </span>
                <input
                  id="batchFlatDiscountPercent"
                  name="batchFlatDiscountPercent"
                  type="number"
                  step="any"
                  min={0}
                  max={90}
                  value={Number.isFinite(discount) ? discount : ''}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className={fieldClass}
                />
              </div>
            </div>
          </div>

          <div className="mt-[18px] rounded-[12px] border border-border bg-muted/40 p-[14px_16px]">
            <div className="text-[12.5px] font-semibold text-foreground-secondary">
              What customers will pay
            </div>
            <div className="mt-[10px] flex flex-wrap gap-x-8 gap-y-3">
              {PREVIEW_FEES.map((instant) => (
                <div key={instant} className="flex flex-col gap-[3px]">
                  <span className="text-[12px] text-muted-foreground">
                    Instant ₦{instant.toLocaleString()}
                  </span>
                  <span className="text-[15px] font-bold tabular-nums text-foreground">
                    ₦{previewBatchFee(instant, discount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/*
        The hidden fields keep the inactive model's values intact on save. The
        server accepts a partial PATCH, but the page posts one flat FormData —
        without these, switching to flat-discount would submit the floors as
        empty and zero them out.
      */}
      {isWindow ? (
        <input
          type="hidden"
          name="batchFlatDiscountPercent"
          value={Number.isFinite(discount) ? discount : 0}
        />
      ) : (
        <>
          <input type="hidden" name="batchFlatFeeBike" value={config.batchFlatFeeBike} />
          <input type="hidden" name="batchFlatFeeCar" value={config.batchFlatFeeCar} />
          <input type="hidden" name="batchFlatFeeTruck" value={config.batchFlatFeeTruck} />
        </>
      )}
    </div>
  );
}
