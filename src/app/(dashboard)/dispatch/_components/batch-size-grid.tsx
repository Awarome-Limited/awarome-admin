'use client';

import { useState } from 'react';

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

const inputClass =
  'w-full border-none bg-transparent text-[14px] font-semibold tabular-nums text-foreground outline-none';

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
    <div
      className={`flex items-center gap-2 rounded-[10px] border bg-muted px-[13px] py-[10px] ${
        invalid ? 'border-destructive' : 'border-input'
      }`}
    >
      <span className="text-[13px] font-semibold text-muted-foreground">#</span>
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
    <div className="rounded-[14px] border border-border bg-card p-[22px_24px] shadow-[var(--shadow-card)]">
      <div className="text-[15px] font-semibold text-foreground">Batch size</div>
      <div className="mb-[18px] mt-1 text-[13px] text-muted-foreground">
        How many drops one rider carries. The maximum is the route cap and
        applies to both pricing models — a cluster that reaches it starts a new
        batch rather than growing. The minimum only applies under the
        flat-discount model, which has no window cutoff to trigger formation:
        a cluster waits until it has that many drops.
      </div>

      <div className="flex flex-col gap-3">
        <div className="hidden gap-4 px-[2px] text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[90px_1fr_1fr]">
          <span>Vehicle</span>
          <span>Min drops</span>
          <span>Max drops</span>
        </div>

        {VEHICLES.map(({ key, label }) => {
          const invalid = min[key] > max[key];
          return (
            <div
              key={key}
              className="grid gap-3 sm:grid-cols-[90px_1fr_1fr] sm:items-center"
            >
              <span className="text-[13px] font-semibold text-foreground">
                {label}
              </span>
              <div className="flex flex-col gap-[6px]">
                <span className="text-[12px] text-muted-foreground sm:hidden">
                  Min drops
                </span>
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
              <div className="flex flex-col gap-[6px]">
                <span className="text-[12px] text-muted-foreground sm:hidden">
                  Max drops
                </span>
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
        <div className="mt-4 rounded-[12px] border border-destructive/40 bg-destructive/10 p-[13px_16px] text-[12.5px] leading-[1.5] text-destructive">
          <strong className="font-semibold">
            {offending.map((v) => v.label).join(', ')}:
          </strong>{' '}
          the minimum is above the route cap, so a batch could never reach it —
          every one would wait out the cap below and go to the in-house fleet.
          Lower the minimum, or raise the cap, to save.
        </div>
      )}

      <div className="mt-[22px] border-t border-border pt-[18px]">
        <div className="text-[13.5px] font-semibold text-foreground">
          Dispatch anyway after
        </div>
        <div className="mb-[14px] mt-1 text-[12.5px] text-muted-foreground">
          Flat-discount model only. If a cluster never reaches its minimum, it
          is dispatched to the in-house fleet once its oldest paid drop has
          waited this long — nothing sits in the pool indefinitely.
        </div>
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          <div className="flex flex-col gap-[7px]">
            <span className="text-[13px] font-medium text-foreground-secondary">
              Wait cap
            </span>
            <div className="flex items-center gap-2 rounded-[10px] border border-input bg-muted px-[13px] py-[10px]">
              <span className="text-[13px] font-semibold text-muted-foreground">
                min
              </span>
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
          </div>
        </div>
      </div>
    </div>
  );
}
