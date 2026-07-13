import { authedFetch, ApiError, SingleResponse } from '@/lib/api-client';
import { DeliveryZoneConfig } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { ZonesEditor } from './_components/zones-editor';

export default async function ZonesPage() {
  let config: DeliveryZoneConfig;
  try {
    const result = await authedFetch<SingleResponse<DeliveryZoneConfig>>(
      '/admins/delivery-zones'
    );
    config = result.data;
  } catch (error) {
    return (
      <ApiErrorCard
        message={
          error instanceof ApiError ? error.message : 'Something went wrong.'
        }
      />
    );
  }

  return <ZonesEditor config={config} />;
}
