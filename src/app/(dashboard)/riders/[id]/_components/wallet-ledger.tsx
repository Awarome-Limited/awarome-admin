import Link from 'next/link';
import type { ReactNode } from 'react';
import type { RiderLedgerEntry } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { EmptyRow } from '@/components/page';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { naira, payoutStatusLabel, payoutStatusVariant } from '../../../payouts/payout-format';

const LABELS: Record<string, string> = {
  'rider-earning': 'Trip earnings',
  'rider-cash-collection': 'Collected from customer',
  'rider-wallet-funding': 'Wallet top-up',
  'rider-adjustment': 'Adjustment',
  'rider-withdrawal': 'Payout',
};

function entryLabel(entry: RiderLedgerEntry) {
  if (entry.type === 'rider-withdrawal' && entry.payout?.trigger === 'rider-request') return 'Withdrawal';
  return LABELS[entry.type] ?? entry.type;
}

const linkClass = 'hover:text-primary underline-offset-2 hover:underline';

/** The supporting line under an entry: what it was for, and who or what caused it. */
function entryDetail(entry: RiderLedgerEntry): ReactNode[] {
  const parts: ReactNode[] = [];
  if (entry.order) {
    parts.push(
      <Link key="order" href={`/orders/${entry.order._id}`} className={linkClass}>
        Order {entry.order.orderId ?? ''}
      </Link>
    );
  }
  if (entry.delivery) {
    parts.push(
      <Link key="delivery" href={`/deliveries/${entry.delivery._id}`} className={linkClass}>
        Delivery {entry.delivery.deliveryId ?? ''}
      </Link>
    );
  }
  if (entry.type === 'rider-earning' && entry.commission != null && entry.grossFee != null) {
    parts.push(`${naira(entry.grossFee)} fee less ${naira(entry.commission)} commission`);
  }
  if (entry.sender) parts.push(`From ${entry.sender}`);
  if (entry.note && entry.type !== 'rider-cash-collection') parts.push(entry.note);
  if (entry.staff) parts.push(`By ${entry.staff.name}`);
  return parts;
}

function entryStatus(entry: RiderLedgerEntry) {
  if (entry.payout) {
    return (
      <Link href={`/payouts/${entry.payout._id}`}>
        <Badge variant={payoutStatusVariant(entry.payout.status)}>
          {payoutStatusLabel(entry.payout.status)}
        </Badge>
      </Link>
    );
  }
  if (entry.status === 'failed') return <Badge variant="destructive">Failed, not counted</Badge>;
  if (entry.status === 'pending') return <Badge variant="info">Pending</Badge>;
  return null;
}

export function WalletLedger({ entries }: { entries: RiderLedgerEntry[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Entry</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Balance after</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => {
            const detail = entryDetail(entry);
            const status = entryStatus(entry);
            const failed = entry.status === 'failed';
            return (
              <TableRow key={entry._id}>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-2 font-medium">
                    {entryLabel(entry)}
                    {status}
                  </div>
                  <div className="text-[12.5px] text-muted-foreground">
                    {formatDate(entry.createdAt)}
                    {detail.map((part, i) => (
                      <span key={i}> · {part}</span>
                    ))}
                  </div>
                </TableCell>
                <TableCell
                  className={cn(
                    'text-right font-medium tabular-nums whitespace-nowrap',
                    failed ? 'text-muted-foreground line-through' : entry.amount > 0 && 'text-positive'
                  )}
                >
                  {entry.amount > 0 ? '+' : '−'} {naira(Math.abs(entry.amount))}
                </TableCell>
                <TableCell
                  className={cn(
                    'text-right tabular-nums whitespace-nowrap',
                    entry.balanceAfter != null && entry.balanceAfter < 0 && 'text-destructive'
                  )}
                >
                  {entry.balanceAfter == null
                    ? '—'
                    : `${entry.balanceAfter < 0 ? '−' : ''}${naira(Math.abs(entry.balanceAfter))}`}
                </TableCell>
              </TableRow>
            );
          })}
          {entries.length === 0 && (
            <EmptyRow
              colSpan={3}
              title="No wallet activity yet"
              body="Earnings, top-ups, cash collected and payouts show up here."
            />
          )}
        </TableBody>
      </Table>
    </div>
  );
}
