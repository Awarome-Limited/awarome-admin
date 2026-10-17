'use client';

import { InlineNotice, PageHeader, PageStack } from '@/components/page';
import { SaveBar } from '@/components/save-bar';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
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

function describeOutstandingLimit(value: string): string {
  const limit = Number(value);
  if (value.trim() === '' || !Number.isInteger(limit) || limit < 0) {
    return 'Enter a whole number, 0 or more.';
  }
  if (limit === 0) {
    return 'No limit — customers can book any number of pay-on-delivery runs before settling.';
  }
  if (limit === 1) {
    return 'Customers must settle their current run before booking another.';
  }
  return `Up to ${limit} unsettled runs per customer.`;
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
  const [maxOutstanding, setMaxOutstanding] = useState(
    String(config.payOnDelivery?.maxOutstanding ?? 1)
  );
  const [isPending, startTransition] = useTransition();
  // What the API last stored, to drive the floating save bar and Discard.
  const snapshot = JSON.stringify({ rows, batchEnabled, maxOutstanding });
  const [saved, setSaved] = useState(snapshot);
  const dirty = snapshot !== saved;
  function discard() {
    const s = JSON.parse(saved);
    setRows(s.rows); setBatchEnabled(s.batchEnabled); setMaxOutstanding(s.maxOutstanding);
  }

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

    const outstandingLimit = Number(maxOutstanding);
    if (
      maxOutstanding.trim() === '' ||
      !Number.isInteger(outstandingLimit) ||
      outstandingLimit < 0
    ) {
      toast.error(
        'The pay-on-delivery limit must be a whole number, 0 or more.'
      );
      return;
    }

    startTransition(async () => {
      try {
        await updateDeliveryOptions({
          batchEnabled,
          payOnDelivery: { maxOutstanding: outstandingLimit },
          vehicles: rows.map((row) => ({
            ...row,
            disabledMessage: row.disabledMessage?.trim() || undefined,
          })),
        });
        setSaved(snapshot);
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
    <PageStack>
      <PageHeader title="Delivery options" subtitle={<>Which vehicles we&apos;re running, and where. Applies to new quotes and new checkouts only: jobs already paid for keep dispatching. Changes apply within 15 seconds.</>} />

      <div className="flex flex-col gap-4" >
        {(offCount > 0 || !batchEnabled) && (
<InlineNotice>
            {!batchEnabled && 'Batch delivery is switched off. '}
            {offCount > 0 &&
              `${offCount} vehicle${offCount > 1 ? 's are' : ' is'} switched off — customers are told why at checkout.`}
          </InlineNotice>
        )}

        <div className="flex flex-col gap-[18px] rounded-[10px] border border-border bg-card px-6 py-[22px]">
          <div className="font-heading text-[17px] font-bold tracking-[-0.03em] text-foreground">
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

        <div className="flex flex-col gap-[18px] rounded-[10px] border border-border bg-card px-6 py-[22px]">
          <div className="font-heading text-[17px] font-bold tracking-[-0.03em] text-foreground">
            Pay on delivery
          </div>
          <div className="mb-[18px] mt-1 text-[13px] text-muted-foreground">
            How many unsettled pay-on-delivery runs one customer can have at
            once. Set 0 for no limit.
          </div>
          <div className="flex flex-col gap-[7px]">
            <label
              htmlFor="pod-max-outstanding"
              className="text-[13.5px] font-medium text-foreground"
            >
              Unsettled pay-on-delivery runs allowed per customer
            </label>
            <input
              id="pod-max-outstanding"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={maxOutstanding}
              onChange={(e) => setMaxOutstanding(e.target.value)}
              className="field w-[140px]"
            />
            <span className="text-[11.5px] text-muted-foreground">
              {describeOutstandingLimit(maxOutstanding)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-[18px] rounded-[10px] border border-border bg-card px-6 py-[22px]">
          <div className="font-heading text-[17px] font-bold tracking-[-0.03em] text-foreground">
            Vehicles
          </div>
          <div className="mb-[18px] mt-1 text-[13px] text-muted-foreground">
            A vehicle is offered only when its master switch, its delivery
            option and its surface are all on.
          </div>

          <div className="mb-4 rounded-[10px] border border-border bg-muted p-[14px_16px] text-[12.5px] leading-[1.55] text-muted-foreground">
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
                className="rounded-[10px] border border-border bg-muted p-[14px_16px]"
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
                              className="flex items-center gap-2 text-[13.5px] font-medium text-foreground"
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
                  <span className="text-[13.5px] font-medium text-foreground">
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
                    className="field w-full"
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
      <SaveBar dirty={dirty} saving={isPending} label="Unsaved delivery option changes" onDiscard={discard} onSave={handleSave} />
    </PageStack>
  );
}
