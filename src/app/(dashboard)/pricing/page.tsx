import { authedFetch, ApiError, SingleResponse } from '@/lib/api-client';
import { PricingConfig } from '@/lib/types';
import { PricingEditor } from './_components/pricing-editor';
import { PageHeader, PageStack } from '@/components/page';
import { ApiErrorCard } from '@/components/api-error-card';
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
      batchPricingModel:
        formData.get('batchPricingModel') === 'flat-discount'
          ? 'flat-discount'
          : 'window',
      batchFlatDiscountPercent: num('batchFlatDiscountPercent'),
      batchFlatFeeBike: num('batchFlatFeeBike'),
      batchFlatFeeCar: num('batchFlatFeeCar'),
      batchFlatFeeTruck: num('batchFlatFeeTruck'),
      paystackCollectionPercent: num('paystackCollectionPercent'),
      // Entered in naira, stored in kobo.
      paystackCollectionCapKobo: Math.round(num('paystackCollectionCapNaira') * 100),
    });
  }

  return (
    <PageStack>
      <PageHeader title="Pricing" subtitle="Changes apply immediately to new fee quotes. No redeploy needed." />
      <PricingEditor config={config} action={handleSave} />
    </PageStack>
  );
}
