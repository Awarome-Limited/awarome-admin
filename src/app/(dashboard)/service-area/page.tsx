import { authedFetch, ApiError, SingleResponse } from '@/lib/api-client';
import { ServiceAreaConfig } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { ServiceAreaEditor } from './_components/service-area-editor';

export default async function ServiceAreaPage() {
  let config: ServiceAreaConfig;
  try {
    const result = await authedFetch<SingleResponse<ServiceAreaConfig>>('/admins/service-area');
    config = result.data;
  } catch (error) {
    return (
      <ApiErrorCard message={error instanceof ApiError ? error.message : 'Something went wrong.'} />
    );
  }

  return <ServiceAreaEditor config={config} />;
}
