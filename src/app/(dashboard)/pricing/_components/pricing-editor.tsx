'use client';

import { Fragment, useState } from 'react';
import type { PricingConfig } from '@/lib/types';
import { SettingsForm } from '@/components/settings-form';
import { Field, FieldGrid, Panel, SettingsLayout } from '@/components/page';
import { segmentItem, segmentTrack } from '@/components/segmented';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BatchPricingModelSection } from './batch-pricing-model';

type Vehicle = 'bike' | 'car' | 'truck';

interface QuoteInputs {
  baseFare: number;
  minimumDeliveryCharge: number;
  perKm: Record<Vehicle, number>;
}

/**
 * Mirrors awarome-BE `calculateInstantDeliveryCharge` (deliveries/utils/
 * instantPricing.ts): base fare, then each distance tier at its factor, any
 * uncovered distance at the top tier, rounded up to ₦50, then the minimum.
 * Keep the two in step or the preview quotes one number and checkout another.
 */
function quote(km: number, perKm: number, inputs: QuoteInputs, tiers: PricingConfig['distanceTiers']) {
  let distanceCharge = 0;
  let applied = 0;
  for (const tier of tiers) {
    if (km > tier.min) {
      const d = Math.min(km, tier.max) - tier.min;
      if (d > 0) {
        distanceCharge += d * perKm * tier.factor;
        applied += d;
      }
    }
    if (applied >= km) break;
  }
  if (applied < km && tiers.length) {
    distanceCharge += (km - applied) * perKm * tiers[tiers.length - 1].factor;
  }
  const rounded = Math.ceil((inputs.baseFare + distanceCharge) / 50) * 50;
  const floored = rounded < inputs.minimumDeliveryCharge;
  return { distanceCharge, total: floored ? inputs.minimumDeliveryCharge : rounded, floored };
}

const naira = (n: number) => `₦ ${Math.round(n).toLocaleString()}`;

function readInputs(form: HTMLFormElement, fallback: QuoteInputs): QuoteInputs {
  const num = (name: string, fb: number) => {
    const el = form.elements.namedItem(name) as HTMLInputElement | null;
    const v = el ? Number(el.value) : NaN;
    return Number.isFinite(v) ? v : fb;
  };
  return {
    baseFare: num('baseFare', fallback.baseFare),
    minimumDeliveryCharge: num('minimumDeliveryCharge', fallback.minimumDeliveryCharge),
    perKm: {
      bike: num('pricePerKmBike', fallback.perKm.bike),
      car: num('pricePerKmCar', fallback.perKm.car),
      truck: num('pricePerKmTruck', fallback.perKm.truck),
    },
  };
}

export function PricingEditor({
  config,
  action,
}: {
  config: PricingConfig;
  action: (formData: FormData) => Promise<void>;
}) {
  const initial: QuoteInputs = {
    baseFare: config.baseFare,
    minimumDeliveryCharge: config.minimumDeliveryCharge,
    perKm: { bike: config.pricePerKmBike, car: config.pricePerKmCar, truck: config.pricePerKmTruck },
  };
  const [inputs, setInputs] = useState(initial);
  const [vehicle, setVehicle] = useState<Vehicle>('bike');
  const [km, setKm] = useState(8);
  const q = quote(km, inputs.perKm[vehicle], inputs, config.distanceTiers);

  const groups = [
    {
      title: 'Delivery pricing',
      sub: 'Base rates applied to every fee quote.',
      fields: [
        { label: 'Base fare', name: 'baseFare', unit: '₦', value: config.baseFare },
        { label: 'Per km, bike', name: 'pricePerKmBike', unit: '₦', value: config.pricePerKmBike },
        { label: 'Per km, car', name: 'pricePerKmCar', unit: '₦', value: config.pricePerKmCar },
        { label: 'Per km, truck', name: 'pricePerKmTruck', unit: '₦', value: config.pricePerKmTruck },
        { label: 'Minimum delivery charge', name: 'minimumDeliveryCharge', unit: '₦', value: config.minimumDeliveryCharge },
        { label: 'Service charge cap', name: 'serviceChargeCap', unit: '₦', value: config.serviceChargeCap },
      ],
    },
    {
      title: 'Payment collection (Paystack)',
      sub: "Awarome Business only. Paystack's fee for receiving the receiver's transfer, passed straight to the business. It is not Awarome revenue. New bookings use these values; existing deliveries keep the rate they were booked at.",
      fields: [
        { label: 'Collection charge', name: 'paystackCollectionPercent', unit: '%', value: config.paystackCollectionPercent ?? 1 },
        { label: 'Charge cap', name: 'paystackCollectionCapNaira', unit: '₦', value: (config.paystackCollectionCapKobo ?? 30000) / 100 },
      ],
    },
    {
      title: 'Legacy batch bands (not in use)',
      sub: 'Nothing reads these; batch is priced by the model above. They stay visible so the stored values aren’t a mystery. Editing them has no effect.',
      fields: [
        { label: 'Short-distance threshold', name: 'batchDeliveryShortDistanceKm', unit: 'km', value: config.batchDeliveryShortDistanceKm },
        { label: 'Medium-distance threshold', name: 'batchDeliveryMediumDistanceKm', unit: 'km', value: config.batchDeliveryMediumDistanceKm },
        { label: 'Short-band charge', name: 'batchDeliveryShortCharge', unit: '₦', value: config.batchDeliveryShortCharge },
        { label: 'Medium-band charge', name: 'batchDeliveryMediumCharge', unit: '₦', value: config.batchDeliveryMediumCharge },
        { label: 'Long-band charge', name: 'batchDeliveryLongCharge', unit: '₦', value: config.batchDeliveryLongCharge },
      ],
    },
  ];

  // The quote controls are not settings: keep them from marking the form dirty.
  const stop = (event: React.SyntheticEvent) => event.stopPropagation();

  return (
    <SettingsForm
      action={action}
      label="Unsaved pricing changes"
      successMessage="Pricing saved"
      onChange={(form) => setInputs(readInputs(form, initial))}
    >
      <SettingsLayout
        aside={
          <Panel title="Quote check" description="What a customer pays for an instant delivery with these values.">
            <div className={segmentTrack} onInput={stop} onChange={stop}>
              {(['bike', 'car', 'truck'] as Vehicle[]).map((v) => (
                <button key={v} type="button" onClick={() => setVehicle(v)} className={segmentItem(vehicle === v, 'sm')}>
                  {v[0].toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
            <label className="flex flex-col gap-2 text-[13px] text-foreground-secondary" onInput={stop} onChange={stop}>
              <span className="flex justify-between">
                <span>Distance</span>
                <strong className="font-semibold text-foreground tabular-nums">{km} km</strong>
              </span>
              <input
                type="range"
                min={1}
                max={40}
                value={km}
                onChange={(e) => setKm(Number(e.target.value))}
                className="accent-primary"
              />
            </label>
            <div className="flex flex-col gap-2 border-t border-border pt-3.5 text-[13.5px]">
              <div className="flex justify-between text-foreground-secondary">
                <span>Base fare</span>
                <span className="tabular-nums">{naira(inputs.baseFare)}</span>
              </div>
              <div className="flex justify-between text-foreground-secondary">
                <span>
                  {km} km at {naira(inputs.perKm[vehicle])}/km, by tier
                </span>
                <span className="tabular-nums">{naira(q.distanceCharge)}</span>
              </div>
              {q.floored && (
                <div className="flex justify-between text-warning">
                  <span>Raised to minimum</span>
                  <span className="tabular-nums">{naira(inputs.minimumDeliveryCharge)}</span>
                </div>
              )}
            </div>
            <div className="flex items-baseline justify-between border-t border-border pt-3.5">
              <span className="text-[13.5px] font-medium">Customer pays</span>
              <span className="stat-value text-[26px] leading-none">{naira(q.total)}</span>
            </div>
          </Panel>
        }
      >
        {groups.map((group, index) => (
          <Fragment key={group.title}>
            {/* The live batch model sits directly under the base rates it
                discounts, and above the legacy bands it replaced. */}
            {index === 2 && <BatchPricingModelSection config={config} />}
            <Panel title={group.title} description={group.sub}>
              <FieldGrid>
                {group.fields.map((field) => (
                  <Field key={field.name} label={field.label} htmlFor={field.name}>
                    <div className="field-wrap">
                      <span>{field.unit}</span>
                      <input
                        id={field.name}
                        name={field.name}
                        type="number"
                        step="any"
                        defaultValue={field.value}
                        className="w-full border-0 bg-transparent text-foreground tabular-nums outline-none"
                      />
                    </div>
                  </Field>
                ))}
              </FieldGrid>
            </Panel>
          </Fragment>
        ))}

        <Panel
          flush
          title="Distance tiers"
          description="Per-km discount bands applied to instant pricing. Change these through the API."
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead className="text-right">Rate factor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {config.distanceTiers.map((tier, i) => (
                <TableRow key={i}>
                  <TableCell className="tabular-nums">{tier.min} km</TableCell>
                  <TableCell className="tabular-nums">{tier.max >= 100000 ? 'And beyond' : `${tier.max} km`}</TableCell>
                  <TableCell className="text-right tabular-nums">× {tier.factor}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      </SettingsLayout>
    </SettingsForm>
  );
}
