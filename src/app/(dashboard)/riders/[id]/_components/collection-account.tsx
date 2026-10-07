'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { RiderCollectionAccount } from '@/lib/types';
import { retryRiderCollectionAccount } from '../../actions';

const STATUS: Record<RiderCollectionAccount['status'], { text: string; variant: 'positive' | 'warning' | 'destructive' | 'secondary' }> = {
  ready: { text: 'Ready', variant: 'positive' },
  requested: { text: 'Setting up', variant: 'warning' },
  failed: { text: 'Failed', variant: 'destructive' },
  deactivated: { text: 'Closed', variant: 'secondary' },
};

/**
 * The rider's own dedicated account, on Wema. Anything transferred into it
 * funds their rider wallet — usually to clear commission owed on
 * pay-on-delivery runs. Customers' accounts are on Titan, so a rider who is
 * also a customer has one of each.
 */
export function RiderCollectionAccountCard({
  riderId,
  account,
  canUpdate,
}: {
  riderId: string;
  account: RiderCollectionAccount | null;
  canUpdate: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const retry = () =>
    startTransition(async () => {
      const result = await retryRiderCollectionAccount(riderId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Requested from Paystack');
      router.refresh();
    });

  if (!account) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">
          No account yet. One is requested when the rider is approved, or the first time they open
          their wallet.
        </span>
        {canUpdate && (
          <Button size="sm" variant="outline" onClick={retry} disabled={isPending}>
            Set up now
          </Button>
        )}
      </div>
    );
  }

  const status = STATUS[account.status];
  // From before riders had their own bank: the shared customer account, or an
  // old rider account elsewhere. Retrying asks Paystack for a Wema one.
  const legacy = account.status !== 'deactivated' && (!!account.customer || account.bankSlug !== 'wema-bank');
  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[15px] font-semibold tabular-nums">
          {account.accountNumber ?? '—'}
        </span>
        <Badge variant={status.variant} dot>
          {status.text}
        </Badge>
      </div>
      {account.accountName && (
        <span className="text-muted-foreground">
          {account.accountName}
          {account.bank ? ` · ${account.bank}` : ''}
        </span>
      )}
      {legacy && (
        <span className="rounded-[10px] bg-muted px-3 py-2 text-[12.5px] text-foreground-secondary">
          {account.customer ? (
            <>
              This is still their{' '}
              <Link href={`/users/${account.customer}`} className="font-semibold text-primary hover:underline">
                customer account
              </Link>
              , from before riders had their own. Move them to a Wema wallet account so top-ups reach
              their rider wallet.
            </>
          ) : (
            'This account is from before riders moved to Wema. Move them to a Wema wallet account.'
          )}
        </span>
      )}
      {account.status === 'failed' && account.failureReason && (
        <span className="text-[13px] text-destructive">{account.failureReason}</span>
      )}
      {canUpdate && (account.status === 'failed' || legacy) && (
        <Button size="sm" variant="outline" className="w-fit" onClick={retry} disabled={isPending}>
          {legacy ? 'Move to Wema account' : 'Retry'}
        </Button>
      )}
    </div>
  );
}
