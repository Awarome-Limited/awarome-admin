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
 * The rider's own dedicated account: it funds their rider wallet, and
 * receivers pay into it on Awarome Business drops. It is opened under a
 * rider-only Paystack email, so it is separate from any customer account the
 * rider has, even on the same bank. Older accounts keep taking payments for a
 * grace period after a move.
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
          <Button size="sm" variant="outline" onClick={retry} loading={isPending}>
            Set up now
          </Button>
        )}
      </div>
    );
  }

  const status = STATUS[account.status];
  // Not the current kind of rider account: the shared customer account from
  // before riders had their own, or one on the old bank. Retrying moves them.
  const legacy = account.status !== 'deactivated' && (!!account.customer || account.current === false);
  const stillOpen = (account.previousAccounts ?? []).filter((p) => !p.closedAt);
  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="tabular-nums text-[15px] font-semibold tabular-nums">
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
              <Link href={`/users/${account.customer}`} className="font-semibold text-primary hover:text-warning">
                customer account
              </Link>
              , from before riders had their own. Move them to their own rider account so top-ups reach
              their rider wallet.
            </>
          ) : (
            'This account is from before the move to the current rider bank. Moving them keeps this one working for 30 days.'
          )}
        </span>
      )}
      {stillOpen.map((p) => (
        <span key={p.accountNumber} className="text-[12.5px] text-muted-foreground">
          Previous account {p.bank ? `${p.bank} ` : ''}
          <span className="tabular-nums">{p.accountNumber}</span> still takes payments until{' '}
          {new Date(p.closesAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.
        </span>
      ))}
      {account.status === 'failed' && account.failureReason && (
        <span className="text-[13px] text-destructive">{account.failureReason}</span>
      )}
      {canUpdate && (account.status === 'failed' || legacy) && (
        <Button size="sm" variant="outline" className="w-fit" onClick={retry} loading={isPending}>
          {legacy ? 'Move to new rider account' : 'Retry'}
        </Button>
      )}
    </div>
  );
}
