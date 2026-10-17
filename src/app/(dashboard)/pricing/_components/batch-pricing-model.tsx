'use client';

import { useState } from 'react';
import { BatchPricingModel, PricingConfig } from '@/lib/types';
import { Field, FieldGrid, Panel } from '@/components/page';
import { RadioCards } from '@/components/radio-cards';

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

const fieldClass = 'w-full border-0 bg-transparent text-foreground tabular-nums outline-none';

export function BatchPricingModelSection({ config }: { config: PricingConfig }) {
  const [model, setModel] = useState<BatchPricingModel>(
    config.batchPricingModel ?? 'window'
  );
  const [discount, setDiscount] = useState<number>(
    config.batchFlatDiscountPercent ?? 35
  );

  const isWindow = model === 'window';

  return (
    <Panel
      title="Batch delivery pricing"
      description="How batch delivery is priced, and whether customers pick a delivery window. Switching models changes the apps too: they read the live model and render the matching checkout."
    >
      <RadioCards
        name="batchPricingModel"
        value={model}
        onChange={setModel}
        columns="stack"
        options={MODELS.map((option) => ({ value: option.value, label: option.title, meta: option.description }))}
      />

      {isWindow ? (
        <div className="flex flex-col gap-3.5 border-t border-border pt-[18px]">
          <div>
            <div className="text-[14px] font-medium">Window floors</div>
            <p className="mt-1 text-[13px] text-foreground-secondary">
              The 4PM–8PM price per vehicle. Earlier windows scale up toward the instant fee. Keep these below the
              minimum delivery charge.
            </p>
          </div>
          <FieldGrid>
            {[
              { label: 'Floor, bike', name: 'batchFlatFeeBike', value: config.batchFlatFeeBike },
              { label: 'Floor, car', name: 'batchFlatFeeCar', value: config.batchFlatFeeCar },
              { label: 'Floor, truck', name: 'batchFlatFeeTruck', value: config.batchFlatFeeTruck },
            ].map((field) => (
              <Field key={field.name} label={field.label} htmlFor={field.name}>
                <div className="field-wrap">
                  <span>₦</span>
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
              </Field>
            ))}
          </FieldGrid>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5 border-t border-border pt-[18px]">
          <FieldGrid>
            <Field
              label="Discount off instant"
              htmlFor="batchFlatDiscountPercent"
              help="A percentage of the instant fee, so longer trips still cost more."
            >
              <div className="field-wrap">
                <span>%</span>
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
            </Field>
          </FieldGrid>
          <div className="rounded-[8px] bg-hi-soft px-4 py-3.5">
            <div className="text-[13px] font-medium">What customers will pay</div>
            <div className="mt-2.5 flex flex-wrap gap-x-8 gap-y-3">
              {PREVIEW_FEES.map((instant) => (
                <div key={instant} className="flex flex-col gap-[3px]">
                  <span className="text-[12.5px] text-foreground-secondary">Instant ₦ {instant.toLocaleString()}</span>
                  <span className="stat-value text-[18px]">₦ {previewBatchFee(instant, discount).toLocaleString()}</span>
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
        <input type="hidden" name="batchFlatDiscountPercent" value={Number.isFinite(discount) ? discount : 0} />
      ) : (
        <>
          <input type="hidden" name="batchFlatFeeBike" value={config.batchFlatFeeBike} />
          <input type="hidden" name="batchFlatFeeCar" value={config.batchFlatFeeCar} />
          <input type="hidden" name="batchFlatFeeTruck" value={config.batchFlatFeeTruck} />
        </>
      )}
    </Panel>
  );
}
