'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import type { BusinessFeeMode } from '@/lib/types';
import { updateBusiness } from '../actions';

export function FeeModeSelect({ businessId, value }: { businessId: string; value: BusinessFeeMode }) {
  const [isPending, startTransition] = useTransition();
  return (
    <select
      defaultValue={value}
      disabled={isPending}
      aria-label="Delivery fee default"
      onChange={(e) => {
        const defaultFeeMode = e.target.value as BusinessFeeMode;
        startTransition(async () => {
          const result = await updateBusiness(businessId, { defaultFeeMode });
          if (result.ok) toast.success('Delivery fee default updated');
          else toast.error(result.error);
        });
      }}
      className="field pr-9"
    >
      <option value="inclusive">Included in amount collected</option>
      <option value="added">Added on top of item price</option>
    </select>
  );
}
