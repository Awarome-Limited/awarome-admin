'use client';

import { useState } from 'react';
import { Field, FieldGrid, InlineNotice, Panel } from '@/components/page';

export interface PerVehicleBatchSize {
  bike: number;
  car: number;
  truck: number;
}

const VEHICLES: { key: keyof PerVehicleBatchSize; label: string }[] = [
  { key: 'bike', label: 'Bike' },
  { key: 'car', label: 'Car' },
  { key: 'truck', label: 'Truck' },
];

const inputClass = 'w-full border-0 bg-transparent text-foreground tabular-nums outline-none';

function SizeInput({
  name,
  value,
  invalid,
  max,
  onChange,
}: {
  name: string;
  value: number;
  invalid: boolean;
  /** Upper bound enforced by the browser, blocking submit rather than just warning. */
  max?: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className={invalid ? 'field-wrap border-destructive' : 'field-wrap'}>
      <span>#</span>
      <input
        id={name}
        name={name}
        type="number"
        step="1"
        min={1}
        max={max}
        value={Number.isFinite(value) ? value : ''}
        onChange={(e) => onChange(Number(e.target.value))}
        className={inputClass}
      />
    </div>
  );
}

/**
 * Minimum and maximum drops, paired per vehicle.
 *
 * They're shown side by side because the relationship between them is the
 * thing that matters: a minimum above the route cap can never be reached, so
 * every batch for that vehicle would wait out the cap below and fall to the
 * in-house fleet — batching would quietly stop working. The server clamps this
 * on read regardless, but it should never get that far.
 */
export function BatchSizeGrid({
  minSize,
  maxSize,
  maxWaitMinutes,
}: {
  minSize: PerVehicleBatchSize;
  maxSize: PerVehicleBatchSize;
  maxWaitMinutes: number;
}) {
  const [min, setMin] = useState<PerVehicleBatchSize>(minSize);
  const [max, setMax] = useState<PerVehicleBatchSize>(maxSize);

  const offending = VEHICLES.filter(
    ({ key }) =>
      Number.isFinite(min[key]) &&
      Number.isFinite(max[key]) &&
      min[key] > max[key]
  );

  return (
    <Panel
      title="Batch size"
      description="How many drops one rider carries. The maximum is the route cap for both pricing models: a cluster that reaches it starts a new batch. The minimum applies only under the flat-discount model, where a cluster waits until it has that many drops."
    >
      <div className="flex flex-col gap-3">
        <div className="hidden gap-4 text-[11.5px] font-medium tracking-[0.06em] text-muted-foreground uppercase sm:grid sm:grid-cols-[90px_1fr_1fr]">
          <span>Vehicle</span>
          <span>Min drops</span>
          <span>Max drops</span>
        </div>

        {VEHICLES.map(({ key, label }) => {
          const invalid = min[key] > max[key];
          return (
            <div key={key} className="grid gap-3 sm:grid-cols-[90px_1fr_1fr] sm:items-center">
              <span className="text-[14px] font-medium">{label}</span>
              <div className="flex flex-col gap-1.5">
                <span className="text-[12.5px] text-muted-foreground sm:hidden">Min drops</span>
                <SizeInput
                  name={`batchMinSize${label}`}
                  value={min[key]}
                  invalid={invalid}
                  // Blocks the save natively — the server rejects this pair
                  // too, but the customer-facing failure mode is bad enough
                  // that it shouldn't be reachable from the form.
                  max={Number.isFinite(max[key]) ? max[key] : undefined}
                  onChange={(next) => setMin((p) => ({ ...p, [key]: next }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[12.5px] text-muted-foreground sm:hidden">Max drops</span>
                <SizeInput
                  name={`batchMaxSize${label}`}
                  value={max[key]}
                  invalid={invalid}
                  onChange={(next) => setMax((p) => ({ ...p, [key]: next }))}
                />
              </div>
            </div>
          );
        })}
      </div>

      {offending.length > 0 && (
        <InlineNotice>
          <strong className="font-semibold">{offending.map((v) => v.label).join(', ')}:</strong> the minimum is above
          the route cap, so a batch could never reach it and every one would go to the in-house fleet. Lower the
          minimum or raise the cap to save.
        </InlineNotice>
      )}

      <div className="border-t border-border pt-[18px]">
        <FieldGrid>
          <Field
            label="Dispatch anyway after"
            htmlFor="batchMaxWaitMinutes"
            help="Flat-discount model only. A cluster that never reaches its minimum goes to the in-house fleet once its oldest paid drop has waited this long."
          >
            <div className="field-wrap">
              <span>min</span>
              <input
                id="batchMaxWaitMinutes"
                name="batchMaxWaitMinutes"
                type="number"
                step="1"
                min={1}
                defaultValue={maxWaitMinutes}
                className={inputClass}
              />
            </div>
          </Field>
        </FieldGrid>
      </div>
    </Panel>
  );
}
