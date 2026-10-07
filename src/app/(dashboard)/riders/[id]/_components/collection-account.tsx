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
 * The rider's own pay-in account. Receivers on bulk drops the receiver pays
 * transfer into it at the door; without it, the rider shows the vendor's
 * account instead.
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
          No account yet. One is requested when the rider is approved, or the first time they reach a
          bulk drop the receiver pays.
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
      {account.customer && account.status !== 'deactivated' && (
        <span className="rounded-[10px] bg-muted px-3 py-2 text-[12.5px] text-foreground-secondary">
          This is also their{' '}
          <Link href={`/users/${account.customer}`} className="font-semibold text-primary hover:underline">
            customer account
          </Link>
          . A transfer counts as a bulk collection only while they’re at a receiver-pays drop; at any other
          time it goes to their own wallet.
        </span>
      )}
      {account.status === 'failed' && account.failureReason && (
        <span className="text-[13px] text-destructive">{account.failureReason}</span>
      )}
      {canUpdate && account.status === 'failed' && (
        <Button size="sm" variant="outline" className="w-fit" onClick={retry} disabled={isPending}>
          Retry
        </Button>
      )}
    </div>
  );
}
