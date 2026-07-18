import { authedFetch, ApiError, SingleResponse } from '@/lib/api-client';
import { ApiErrorCard } from '@/components/api-error-card';
import { Button } from '@/components/ui/button';
import { updateDispatchConfig } from './actions';

interface DispatchConfig {
  batchTargetSize: number;
  batchMaxSize: { bike: number; car: number; truck: number };
  dropoffRadiusKm: number;
  pickupRadiusKm: number;
  dispatchRadiusKm: number;
  maxRidersPerDispatch: number;
  redispatchIntervalMs: number;
  unassignedAfterMs: number;
  vendorAcceptTimeoutMs: number;
  riderCommissionPercent: number;
}

export default async function DispatchPage() {
  let config: DispatchConfig;
  try {
    const result = await authedFetch<SingleResponse<DispatchConfig>>(
      '/admins/dispatch-config'
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
    await updateDispatchConfig({
      riderCommissionPercent: num('riderCommissionPercent'),
      unassignedAfterMs: num('unassignedAfterMinutes') * 60 * 1000,
      vendorAcceptTimeoutMs: num('vendorAcceptTimeoutMinutes') * 60 * 1000,
      redispatchIntervalMs: num('redispatchIntervalSeconds') * 1000,
      dispatchRadiusKm: num('dispatchRadiusKm'),
      maxRidersPerDispatch: num('maxRidersPerDispatch'),
      batchTargetSize: num('batchTargetSize'),
      dropoffRadiusKm: num('dropoffRadiusKm'),
      pickupRadiusKm: num('pickupRadiusKm'),
      batchMaxSize: {
        bike: num('batchMaxSizeBike'),
        car: num('batchMaxSizeCar'),
        truck: num('batchMaxSizeTruck'),
      },
    });
  }

  const groups = [
    {
      title: 'Earnings',
      sub: "Awarome's cut of every delivery fee. Riders are offered and paid the fee net of this commission.",
      fields: [
        {
          label: 'Rider commission',
          name: 'riderCommissionPercent',
          unit: '%',
          value: config.riderCommissionPercent,
        },
      ],
    },
    {
      title: 'Dispatch windows',
      sub: 'How long jobs stay in the live offer pool, and how vendors are held to acceptance.',
      fields: [
        {
          label: 'Unassigned after',
          name: 'unassignedAfterMinutes',
          unit: 'min',
          value: Math.round(config.unassignedAfterMs / 60000),
        },
        {
          label: 'Vendor acceptance timeout',
          name: 'vendorAcceptTimeoutMinutes',
          unit: 'min',
          value: Math.round(config.vendorAcceptTimeoutMs / 60000),
        },
        {
          label: 'Re-broadcast cadence',
          name: 'redispatchIntervalSeconds',
          unit: 'sec',
          value: Math.round(config.redispatchIntervalMs / 1000),
        },
      ],
    },
    {
      title: 'Rider targeting',
      sub: 'Who a new job is offered to.',
      fields: [
        { label: 'Search radius', name: 'dispatchRadiusKm', unit: 'km', value: config.dispatchRadiusKm },
        { label: 'Max riders per dispatch', name: 'maxRidersPerDispatch', unit: '#', value: config.maxRidersPerDispatch },
      ],
    },
    {
      title: 'Batch formation',
      sub: 'Multi-drop clustering. A cluster at or above the target size goes to the gig pool; smaller ones go in-house.',
      fields: [
        { label: 'Gig-pool target size', name: 'batchTargetSize', unit: '#', value: config.batchTargetSize },
        { label: 'Dropoff radius', name: 'dropoffRadiusKm', unit: 'km', value: config.dropoffRadiusKm },
        { label: 'Pickup radius', name: 'pickupRadiusKm', unit: 'km', value: config.pickupRadiusKm },
        { label: 'Max stops — bike', name: 'batchMaxSizeBike', unit: '#', value: config.batchMaxSize.bike },
        { label: 'Max stops — car', name: 'batchMaxSizeCar', unit: '#', value: config.batchMaxSize.car },
        { label: 'Max stops — truck', name: 'batchMaxSizeTruck', unit: '#', value: config.batchMaxSize.truck },
      ],
    },
  ];

  return (
    <form action={handleSave}>
      <div className="flex flex-wrap items-start justify-between gap-4 pb-[18px]">
        <div>
          <h1 className="text-[23px] font-bold tracking-tight text-foreground">Dispatch</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Fleet and commission tunables. Changes apply within 30 seconds — no redeploy needed.
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
      </div>
    </form>
  );
}
