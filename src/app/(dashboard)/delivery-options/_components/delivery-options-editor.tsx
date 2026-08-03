'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  DeliveryOptionsConfig,
  VehicleAvailability,
  VehicleType,
} from '@/lib/types';
import { updateDeliveryOptions } from '../actions';

const VEHICLES: { type: VehicleType; label: string }[] = [
  { type: 'bike', label: 'Bike' },
  { type: 'car', label: 'Car' },
  { type: 'truck', label: 'Truck' },
];

// The three independent switches on each vehicle row. A vehicle is offered only
// when its master switch and BOTH of the matching flags below are on.
const FLAGS: {
  key: 'instant' | 'batch' | 'marketplace' | 'package';
  label: string;
  group: 'option' | 'surface';
}[] = [
  { key: 'instant', label: 'Instant', group: 'option' },
  { key: 'batch', label: 'Batch', group: 'option' },
  { key: 'marketplace', label: 'Marketplace', group: 'surface' },
  { key: 'package', label: 'Send', group: 'surface' },
];

// Always render all three vehicles, even if the API returns a partial list.
function toRows(vehicles: VehicleAvailability[]): VehicleAvailability[] {
  const byType = new Map(vehicles.map((v) => [v.vehicleType, v]));
  return VEHICLES.map(({ type }) => {
    const stored = byType.get(type);
    return {
      vehicleType: type,
      enabled: stored?.enabled ?? true,
      instant: stored?.instant ?? true,
      batch: stored?.batch ?? true,
      marketplace: stored?.marketplace ?? true,
      package: stored?.package ?? true,
      disabledMessage: stored?.disabledMessage ?? '',
    };
  });
}

/** Plain-English summary of what a row currently allows. */
function summarise(row: VehicleAvailability, batchEnabled: boolean): string {
  if (!row.enabled) return 'Off everywhere';

  const options = [
    row.instant && 'Instant',
    row.batch && batchEnabled && 'Batch',
  ].filter(Boolean) as string[];
  const surfaces = [
    row.marketplace && 'Marketplace',
    row.package && 'Send',
  ].filter(Boolean) as string[];

  if (!options.length) return 'No delivery option enabled — effectively off';
  if (!surfaces.length) return 'No surface enabled — effectively off';

  return `${options.join(' + ')} on ${surfaces.join(' + ')}`;
}

export function DeliveryOptionsEditor({
  config,
}: {
  config: DeliveryOptionsConfig;
}) {
  const [rows, setRows] = useState<VehicleAvailability[]>(
    toRows(config.vehicles ?? [])
  );
  const [batchEnabled, setBatchEnabled] = useState(config.batchEnabled ?? true);
  const [isPending, startTransition] = useTransition();

  function updateRow(
    vehicleType: VehicleType,
    patch: Partial<VehicleAvailability>
  ) {
    setRows((prev) =>
      prev.map((row) =>
        row.vehicleType === vehicleType ? { ...row, ...patch } : row
      )
    );
  }

  function handleSave() {
    // Every vehicle off means no customer anywhere can check out — almost
    // certainly a mistake, and operating hours is the right tool for a
    // deliberate shutdown.
    const anyUsable = rows.some(
      (row) =>
        row.enabled &&
        (row.instant || (row.batch && batchEnabled)) &&
        (row.marketplace || row.package)
    );
    if (!anyUsable) {
      toast.error(
        'That switches off every vehicle on every surface — no one could check out. To close the whole business, use Operating hours instead.'
      );
      return;
    }

    startTransition(async () => {
      try {
        await updateDeliveryOptions({
          batchEnabled,
          vehicles: rows.map((row) => ({
            ...row,
            disabledMessage: row.disabledMessage?.trim() || undefined,
          })),
        });
        toast.success('Delivery options saved.');
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to save delivery options.'
        );
      }
    });
  }

  const offCount = rows.filter((row) => !row.enabled).length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 pb-[18px]">
        <div>
          <h1 className="text-[23px] font-bold tracking-tight text-foreground">
            Delivery options
          </h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Which vehicles we&apos;re running, and where. Applies to new quotes
            and new checkouts only — jobs already paid for keep dispatching.
            Changes apply within 15 seconds.
          </p>
        </div>
        <Button type="button" onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>

      <div className="flex flex-col gap-4" style={{ maxWidth: 860 }}>
        {(offCount > 0 || !batchEnabled) && (
          <div className="rounded-[14px] border border-amber-500/40 bg-amber-500/10 p-[16px_20px] text-[13px] font-semibold text-amber-700 dark:text-amber-400">
            {!batchEnabled && 'Batch delivery is switched off. '}
            {offCount > 0 &&
              `${offCount} vehicle${offCount > 1 ? 's are' : ' is'} switched off — customers are told why at checkout.`}
          </div>
        )}

        <div className="rounded-[14px] border border-border bg-card p-[22px_24px] shadow-[var(--shadow-card)]">
          <div className="text-[15px] font-semibold text-foreground">
            Batch delivery
          </div>
          <div className="mb-[18px] mt-1 text-[13px] text-muted-foreground">
            Master switch for batch, independent of any vehicle. Off means only
            instant delivery is offered, everywhere. The apps hide the batch
            option entirely rather than showing it as unavailable.
          </div>
          <label className="flex items-center gap-3 text-[13px] font-semibold text-foreground-secondary">
            <Switch checked={batchEnabled} onCheckedChange={setBatchEnabled} />
            {batchEnabled ? 'Batch delivery is on' : 'Batch delivery is off'}
          </label>
        </div>

        <div className="rounded-[14px] border border-border bg-card p-[22px_24px] shadow-[var(--shadow-card)]">
          <div className="text-[15px] font-semibold text-foreground">
            Vehicles
          </div>
          <div className="mb-[18px] mt-1 text-[13px] text-muted-foreground">
            A vehicle is offered only when its master switch, its delivery
            option and its surface are all on.
          </div>

          <div className="mb-4 rounded-[12px] border border-border bg-muted/40 p-[14px_16px] text-[12.5px] leading-[1.55] text-muted-foreground">
            <strong className="font-semibold text-foreground-secondary">
              Marketplace works differently.
            </strong>{' '}
            Customers never pick a vehicle there — it&apos;s derived from the
            heaviest item in their cart. Switching a vehicle off for Marketplace
            makes any cart containing such an item unfulfillable: those
            customers are blocked at checkout with the offending products named.
            On Send, the customer picks, so the vehicle simply disappears from
            the picker.
          </div>

          <div className="flex flex-col gap-3">
            {rows.map((row) => (
              <div
                key={row.vehicleType}
                className="rounded-[12px] border border-border bg-muted/40 p-[14px_16px]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex min-w-[130px] items-center gap-3 text-[13px] font-semibold text-foreground">
                    <Switch
                      checked={row.enabled}
                      onCheckedChange={(enabled) =>
                        updateRow(row.vehicleType, { enabled })
                      }
                    />
                    {VEHICLES.find((v) => v.type === row.vehicleType)?.label}
                  </label>
                  <span className="text-[12px] text-muted-foreground">
                    {summarise(row, batchEnabled)}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3 border-t border-border pt-3">
                  {(['option', 'surface'] as const).map((group) => (
                    <div key={group} className="flex flex-col gap-2">
                      <span className="text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {group === 'option' ? 'Delivery option' : 'Product'}
                      </span>
                      <div className="flex flex-wrap gap-x-5 gap-y-2">
                        {FLAGS.filter((flag) => flag.group === group).map(
                          (flag) => (
                            <label
                              key={flag.key}
                              className="flex items-center gap-2 text-[12.5px] font-medium text-foreground-secondary"
                            >
                              <Switch
                                checked={row[flag.key]}
                                disabled={!row.enabled}
                                onCheckedChange={(checked) =>
                                  updateRow(row.vehicleType, {
                                    [flag.key]: checked,
                                  })
                                }
                              />
                              {flag.label}
                            </label>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex flex-col gap-[7px]">
                  <span className="text-[12.5px] font-medium text-foreground-secondary">
                    Message shown to customers when this vehicle is off
                  </span>
                  <input
                    value={row.disabledMessage ?? ''}
                    onChange={(e) =>
                      updateRow(row.vehicleType, {
                        disabledMessage: e.target.value,
                      })
                    }
                    maxLength={300}
                    placeholder={`We've paused ${row.vehicleType} deliveries for now.`}
                    className="w-full rounded-[10px] border border-input bg-background px-[13px] py-[9px] text-[13.5px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                  />
                  <span className="text-[11.5px] text-muted-foreground">
                    Leave blank for the default. Use this to explain a specific
                    outage — customers see it verbatim.
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
