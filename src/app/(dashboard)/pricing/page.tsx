import { authedFetch, ApiError, SingleResponse } from '@/lib/api-client';
import { PricingConfig } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { updatePricingConfig } from './actions';

export default async function PricingPage() {
  let config: PricingConfig;
  try {
    const result = await authedFetch<SingleResponse<PricingConfig>>(
      '/admins/pricing-config'
    );
    config = result.data;
  } catch (error) {
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Something went wrong.'}
      />
    );
  }

  async function handleSave(formData: FormData) {
    'use server';
    const num = (name: string) => Number(formData.get(name));
    await updatePricingConfig({
      baseFare: num('baseFare'),
      pricePerKmBike: num('pricePerKmBike'),
      pricePerKmCar: num('pricePerKmCar'),
      pricePerKmTruck: num('pricePerKmTruck'),
      minimumDeliveryCharge: num('minimumDeliveryCharge'),
      serviceChargeCap: num('serviceChargeCap'),
      batchDeliveryShortDistanceKm: num('batchDeliveryShortDistanceKm'),
      batchDeliveryMediumDistanceKm: num('batchDeliveryMediumDistanceKm'),
      batchDeliveryShortCharge: num('batchDeliveryShortCharge'),
      batchDeliveryMediumCharge: num('batchDeliveryMediumCharge'),
      batchDeliveryLongCharge: num('batchDeliveryLongCharge'),
      batchFlatFeeBike: num('batchFlatFeeBike'),
      batchFlatFeeCar: num('batchFlatFeeCar'),
      batchFlatFeeTruck: num('batchFlatFeeTruck'),
    });
  }

  const groups = [
    {
      title: 'Delivery pricing',
      sub: 'Base rates applied to every fee quote',
      fields: [
        { label: 'Base fare', name: 'baseFare', unit: '₦', value: config.baseFare },
        { label: 'Price per km — bike', name: 'pricePerKmBike', unit: '₦', value: config.pricePerKmBike },
        { label: 'Price per km — car', name: 'pricePerKmCar', unit: '₦', value: config.pricePerKmCar },
        { label: 'Price per km — truck', name: 'pricePerKmTruck', unit: '₦', value: config.pricePerKmTruck },
        { label: 'Minimum delivery charge', name: 'minimumDeliveryCharge', unit: '₦', value: config.minimumDeliveryCharge },
        { label: 'Service charge cap', name: 'serviceChargeCap', unit: '₦', value: config.serviceChargeCap },
      ],
    },
    {
      title: 'Batch / eco pricing',
      sub: 'Distance bands for batched and eco product deliveries',
      fields: [
        { label: 'Short-distance threshold', name: 'batchDeliveryShortDistanceKm', unit: 'km', value: config.batchDeliveryShortDistanceKm },
        { label: 'Medium-distance threshold', name: 'batchDeliveryMediumDistanceKm', unit: 'km', value: config.batchDeliveryMediumDistanceKm },
        { label: 'Short-band charge', name: 'batchDeliveryShortCharge', unit: '₦', value: config.batchDeliveryShortCharge },
        { label: 'Medium-band charge', name: 'batchDeliveryMediumCharge', unit: '₦', value: config.batchDeliveryMediumCharge },
        { label: 'Long-band charge', name: 'batchDeliveryLongCharge', unit: '₦', value: config.batchDeliveryLongCharge },
      ],
    },
    {
      title: 'Package batch window floors',
      sub: 'The 4PM–8PM window price per vehicle. Earlier windows are scaled up toward the instant fee. Keep below the minimum delivery charge.',
      fields: [
        { label: 'Flat floor — bike', name: 'batchFlatFeeBike', unit: '₦', value: config.batchFlatFeeBike },
        { label: 'Flat floor — car', name: 'batchFlatFeeCar', unit: '₦', value: config.batchFlatFeeCar },
        { label: 'Flat floor — truck', name: 'batchFlatFeeTruck', unit: '₦', value: config.batchFlatFeeTruck },
      ],
    },
  ];

  return (
    <form action={handleSave}>
      <div className="flex flex-wrap items-start justify-between gap-4 pb-[18px]">
        <div>
          <h1 className="text-[23px] font-bold tracking-tight text-foreground">Pricing</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Changes apply immediately to new fee quotes — no redeploy needed.
          </p>
        </div>
        <Button type="submit">Save changes</Button>
      </div>

      <div className="flex flex-col gap-4" style={{ maxWidth: 900 }}>
        {groups.map((group) => (
          <div
            key={group.title}
            className="rounded-[14px] border border-border bg-card p-[22px_24px] shadow-[var(--shadow-card)]"
          >
            <div className="text-[15px] font-semibold text-foreground">{group.title}</div>
            <div className="mb-[18px] mt-1 text-[13px] text-muted-foreground">{group.sub}</div>
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
              {group.fields.map((field) => (
                <div key={field.name} className="flex flex-col gap-[7px]">
                  <span className="text-[13px] font-medium text-foreground-secondary">
                    {field.label}
                  </span>
                  <div className="flex items-center gap-2 rounded-[10px] border border-input bg-muted px-[13px] py-[10px]">
                    <span className="text-[13px] font-semibold text-muted-foreground">
                      {field.unit}
                    </span>
                    <input
                      id={field.name}
                      name={field.name}
                      type="number"
                      step="any"
                      defaultValue={field.value}
                      className="w-full border-none bg-transparent text-[14px] font-semibold tabular-nums text-foreground outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="rounded-[14px] border border-border bg-card p-[22px_24px] shadow-[var(--shadow-card)]">
          <div className="text-[15px] font-semibold text-foreground">Distance tiers</div>
          <div className="mb-[18px] mt-1 text-[13px] text-muted-foreground">
            Per-km discount bands applied to fast delivery pricing. Edit via the API if these need to change.
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From (km)</TableHead>
                  <TableHead>To (km)</TableHead>
                  <TableHead>Factor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {config.distanceTiers.map((tier, i) => (
                  <TableRow key={i}>
                    <TableCell className="tabular-nums">{tier.min}</TableCell>
                    <TableCell className="tabular-nums">
                      {tier.max >= 100000 ? '∞' : tier.max}
                    </TableCell>
                    <TableCell className="tabular-nums">{tier.factor}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </form>
  );
}
