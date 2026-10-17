'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import type { BusinessBatchRouting } from '@/lib/types';
import { updateBusiness } from '../actions';

export function BatchRoutingSelect({ businessId, value }: { businessId: string; value: BusinessBatchRouting }) {
  const [isPending, startTransition] = useTransition();
  return (
    <select
      defaultValue={value}
      disabled={isPending}
      aria-label="Batch deliveries"
      onChange={(e) => {
        const batchRouting = e.target.value as BusinessBatchRouting;
        startTransition(async () => {
          const result = await updateBusiness(businessId, { batchRouting });
          if (result.ok) toast.success('Batch deliveries updated');
          else toast.error(result.error);
        });
      }}
      className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
    >
      <option value="same_route">Same route only</option>
      <option value="any_route">Any route</option>
    </select>
  );
}
