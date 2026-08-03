import { authedFetch, ApiError, SingleResponse } from '@/lib/api-client';
import { DeliveryOptionsConfig } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { DeliveryOptionsEditor } from './_components/delivery-options-editor';

export default async function DeliveryOptionsPage() {
  let config: DeliveryOptionsConfig;
  try {
    const result = await authedFetch<SingleResponse<DeliveryOptionsConfig>>(
      '/admins/delivery-options'
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

  return <DeliveryOptionsEditor config={config} />;
}
