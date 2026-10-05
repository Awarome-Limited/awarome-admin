'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format';
import type { RiderCollectionCredit } from '@/lib/types';
import { resolveRiderCollectionCredit } from '../../bulk-deliveries/actions';

const naira = (amount: number) => `₦${Math.round(amount).toLocaleString('en-NG')}`;

const KIND: Record<RiderCollectionCredit['kind'], string> = {
  'no-drop': 'Arrived while the rider wasn’t at a bulk drop the receiver pays',
  excess: 'More than the drop owed',
};

/**
 * Money that reached a rider's collection account but didn't settle a drop.
 * It's in Awarome's Paystack balance, not anyone's wallet — refund it or
 * apply it, then mark it resolved.
 */
export function RiderCollectionCredits({
  credits,
  canUpdate,
}: {
  credits: RiderCollectionCredit[];
  canUpdate: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!credits.length) {
    return <p className="text-[13px] text-muted-foreground">Nothing to review.</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {credits.map((credit) => {
        const rider = [credit.rider?.firstName, credit.rider?.lastName].filter(Boolean).join(' ');
        return (
          <div key={`${credit.accountId}-${credit.reference}`} className="flex flex-wrap items-start justify-between gap-3 py-3 text-[13px]">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span>
                <span className="font-semibold tabular-nums">{naira(credit.amount)}</span>
                {credit.senderName ? ` from ${credit.senderName}${credit.senderBank ? ` (${credit.senderBank})` : ''}` : ''}
                {' '}into {rider || 'a rider'}’s account{' '}
                <span className="font-mono">{credit.accountNumber}</span>
              </span>
              <span className="text-muted-foreground">
                {KIND[credit.kind]} · {formatDate(credit.at)}
              </span>
              {credit.delivery?.bulk && (
                <Link href={`/bulk-deliveries/${credit.delivery.bulk}`} className="text-primary hover:underline">
                  {credit.delivery.receiver?.name ?? credit.delivery.deliveryId}
                </Link>
              )}
              <span className="font-mono text-[11px] text-muted-foreground">{credit.reference}</span>
            </div>
            {canUpdate && (
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await resolveRiderCollectionCredit(credit.accountId, credit.reference);
                    if (!result.ok) {
                      toast.error(result.error);
                      return;
                    }
                    toast.success('Marked resolved');
                    router.refresh();
                  })
                }
              >
                Mark resolved
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
