import { authedFetch, ApiError, PaginatedResponse, SingleResponse } from '@/lib/api-client';
import { ApiErrorCard } from '@/components/api-error-card';
import { PageHeader, PageStack } from '@/components/page';
import { updateDispatchConfig } from './actions';
import { DispatchEditor, type DispatchGroup } from './_components/dispatch-editor';

interface DispatchConfig {
  batchTargetSize: number;
  batchMaxSize: { bike: number; car: number; truck: number };
  batchMinSize: { bike: number; car: number; truck: number };
  batchMaxWaitMs: number;
  dropoffRadiusKm: number;
  pickupRadiusKm: number;
  selectionCutoffMinutes: number;
  dispatchRadiusKm: number;
  maxRidersPerDispatch: number;
  redispatchIntervalMs: number;
  unassignedAfterMs: number;
  vendorAcceptTimeoutMs: number;
  riderCommissionPercent: number;
  riderDebtThreshold: number;
  businessBatchMaxDrops: number;
  riderAppMinBuild?: number;
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
      riderDebtThreshold: num('riderDebtThreshold'),
      unassignedAfterMs: num('unassignedAfterMinutes') * 60 * 1000,
      vendorAcceptTimeoutMs: num('vendorAcceptTimeoutMinutes') * 60 * 1000,
      redispatchIntervalMs: num('redispatchIntervalSeconds') * 1000,
      dispatchRadiusKm: num('dispatchRadiusKm'),
      maxRidersPerDispatch: num('maxRidersPerDispatch'),
      batchTargetSize: num('batchTargetSize'),
      dropoffRadiusKm: num('dropoffRadiusKm'),
      pickupRadiusKm: num('pickupRadiusKm'),
      selectionCutoffMinutes: num('selectionCutoffMinutes'),
      businessBatchMaxDrops: num('businessBatchMaxDrops'),
      riderAppMinBuild: num('riderAppMinBuild'),
      batchMaxWaitMs: num('batchMaxWaitMinutes') * 60 * 1000,
      batchMaxSize: {
        bike: num('batchMaxSizeBike'),
        car: num('batchMaxSizeCar'),
        truck: num('batchMaxSizeTruck'),
      },
      batchMinSize: {
        bike: num('batchMinSizeBike'),
        car: num('batchMinSizeCar'),
        truck: num('batchMinSizeTruck'),
      },
    });
  }

  const groups: DispatchGroup[] = [
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
      title: 'Rider debt',
      sub: 'Riders collect pay-on-delivery money themselves and owe Awarome the commission on it. Past this amount they still see jobs but can’t accept them until they fund their wallet or earn it down on prepaid jobs.',
      fields: [
        {
          label: 'Debt limit',
          name: 'riderDebtThreshold',
          unit: '₦',
          value: config.riderDebtThreshold ?? 3000,
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
      title: 'Batch clustering',
      sub: 'How nearby drops are grouped into one multi-drop route, whichever pricing model is live. A cluster at or above the gig-pool target is broadcast to gig riders; smaller ones are handed to the in-house fleet.',
      fields: [
        { label: 'Gig-pool target size', name: 'batchTargetSize', unit: '#', value: config.batchTargetSize },
        { label: 'Dropoff radius', name: 'dropoffRadiusKm', unit: 'km', value: config.dropoffRadiusKm },
        { label: 'Pickup radius', name: 'pickupRadiusKm', unit: 'km', value: config.pickupRadiusKm },
      ],
    },
    {
      title: 'Awarome Business batches',
      sub: 'A business batch booking goes out as one trip, broadcast to riders. This caps how many drops that trip can carry (at least 3). For same-route businesses, every drop must also be within the dropoff radius above of one another.',
      fields: [
        { label: 'Max drops per batch', name: 'businessBatchMaxDrops', unit: '#', value: config.businessBatchMaxDrops ?? 8 },
      ],
    },
    {
      title: 'Courier app',
      sub: 'Riders on an older build of the courier app are stopped until they update. Set it to the build number of a release (the number in brackets, e.g. 14 for 1.0.11 (14)) once that release is live in both stores. 0 lets every build through. Newer releases are always offered to riders, whatever this says.',
      fields: [
        { label: 'Oldest build allowed', name: 'riderAppMinBuild', unit: '#', value: config.riderAppMinBuild ?? 0 },
      ],
    },
    {
      title: 'Delivery windows (window model only)',
      sub: 'When a delivery window closes to customers. Batches for that window form and dispatch at the same moment.',
      fields: [
        { label: 'Window closes before start', name: 'selectionCutoffMinutes', unit: 'min', value: config.selectionCutoffMinutes },
      ],
    },
  ];

  const overLimitRiders = await authedFetch<PaginatedResponse<unknown>>('/riders/admin?owing=over-limit&limit=1')
    .then((r) => r.totalCount ?? 0)
    .catch(() => null);

  return (
    <PageStack>
      <PageHeader
        title="Dispatch rules"
        subtitle="Fleet and commission tunables. Changes apply within 30 seconds. No redeploy needed."
      />
      <DispatchEditor
        groups={groups}
        action={handleSave}
        overLimitRiders={overLimitRiders}
        batch={{
          minSize: config.batchMinSize ?? { bike: 3, car: 3, truck: 3 },
          maxSize: config.batchMaxSize,
          maxWaitMinutes: Math.round((config.batchMaxWaitMs ?? 45 * 60 * 1000) / 60000),
        }}
      />
    </PageStack>
  );
}
