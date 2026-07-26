import { authedFetch, ApiError, SingleResponse } from '@/lib/api-client';
import { OperatingHoursConfig } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { OperatingHoursEditor } from './_components/operating-hours-editor';

export default async function OperatingHoursPage() {
  let config: OperatingHoursConfig;
  try {
    const result = await authedFetch<SingleResponse<OperatingHoursConfig>>(
      '/admins/operating-hours'
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

  return <OperatingHoursEditor config={config} />;
}
