import Link from 'next/link';
import { authedFetch, ApiError, SingleResponse } from '@/lib/api-client';
import type { BulkReceivable } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { formatDate, formatPhone } from '@/lib/format';
import { StatStrip } from '@/components/stat-strip';
import { EmptyRow, InlineNotice, ListCard, PageHeader, PageStack, Panel } from '@/components/page';
import { getSession } from '@/lib/session';
import { hasPermission, PermissionAction, PermissionModule } from '@/lib/permissions';
import type { RiderCollectionCredit } from '@/lib/types';
import { RiderCollectionCredits } from './_components/rider-collection-credits';

const naira = (amount: number) => `₦ ${Math.round(amount).toLocaleString('en-NG')}`;

const DAY_MS = 24 * 60 * 60 * 1000;

function age(since?: string | null) {
  if (!since) return null;
  const days = Math.floor((Date.now() - new Date(since).getTime()) / DAY_MS);
  return days;
}

function name(user: BulkReceivable['user']) {
  if (!user) return 'Unknown customer';
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || user.phone || 'Unknown customer';
}

export default async function BulkReceivablesPage() {
  let data: { customers: BulkReceivable[]; totals: { outstanding: number; dueNow: number } };
  try {
    const res = await authedFetch<
      SingleResponse<{ customers: BulkReceivable[]; totals: { outstanding: number; dueNow: number } }>
    >('/bulk-deliveries/receivables');
    data = res.data;
  } catch (error) {
    return (
      <ApiErrorCard message={error instanceof ApiError ? error.message : 'Something went wrong.'} />
    );
  }

  const { customers, totals } = data;

  const session = await getSession();
  const canUpdate =
    !!session && hasPermission(session.profile, PermissionModule.PAYMENTS, PermissionAction.UPDATE);
  const riderCredits = await authedFetch<SingleResponse<RiderCollectionCredit[]>>(
    '/bulk-deliveries/rider-collection-credits'
  )
    .then((r) => r.data)
    .catch(() => [] as RiderCollectionCredit[]);

  const overdue = customers.filter((row) => {
    const days = age(row.oldestDueSince);
    return days != null && days >= 7;
  }).length;

  return (
    <PageStack>
      <PageHeader
        title="Bulk receivables"
        subtitle="What vendors owe on postpaid bulk drops. Due now is the part that has been delivered."
      />

      <StatStrip
        stats={[
          { label: 'Due now', value: naira(totals.dueNow) },
          { label: 'Total outstanding', value: naira(totals.outstanding) },
          { label: 'Customers owing', value: customers.length.toLocaleString() },
          { label: 'Overdue a week or more', value: overdue.toLocaleString() },
        ]}
      />

      {overdue > 0 && (
        <InlineNotice>
          {overdue === 1 ? '1 customer has' : `${overdue} customers have`} owed on delivered drops for a week or more.
        </InlineNotice>
      )}

      <ListCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Drops</TableHead>
              <TableHead>Oldest unpaid delivery</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead className="text-right">Due now</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((row) => {
              const days = age(row.oldestDueSince);
              return (
                <TableRow key={row.user?._id ?? name(row.user)}>
                  <TableCell>
                    <div className="font-medium">{name(row.user)}</div>
                    <div className="text-[12.5px] text-muted-foreground tabular-nums">
                      {[row.user?.phone && formatPhone(row.user.phone), row.user?.email].filter(Boolean).join(' · ')}
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground-secondary tabular-nums">
                    {row.deliveredDrops} of {row.drops} delivered
                    <div className="text-[12.5px] text-muted-foreground">
                      {row.bulks} {row.bulks === 1 ? 'bulk' : 'bulks'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {days == null ? (
                      <span className="text-muted-foreground">Nothing delivered yet</span>
                    ) : (
                      <Badge variant={days >= 7 ? 'destructive' : days >= 2 ? 'warning' : 'secondary'} dot={days >= 2}>
                        {days === 0 ? 'Today' : `${days} ${days === 1 ? 'day' : 'days'}`}
                        {' · '}
                        {formatDate(row.oldestDueSince).split(',')[0]}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-foreground-secondary tabular-nums">{naira(row.outstanding)}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {row.dueNow > 0 ? naira(row.dueNow) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.user?._id && (
                      <Link
                        href={`/bulk-deliveries?user=${row.user._id}`}
                        className="text-[13.5px] font-medium whitespace-nowrap text-primary hover:text-warning"
                      >
                        View bulks
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {customers.length === 0 && (
              <EmptyRow colSpan={6} title="Nobody owes anything" body="Postpaid bulk drops show up here once booked." />
            )}
          </TableBody>
        </Table>
      </ListCard>

      <Panel
        title={`Rider account payments to review (${riderCredits.length})`}
        description="From before riders collected payment themselves: transfers into riders’ pay-in accounts that didn’t settle a drop. Credit each to the rider’s wallet (Adjust balance on their page) or refund it, then mark it resolved. New transfers into rider accounts fund their wallet automatically and never appear here."
      >
        <RiderCollectionCredits credits={riderCredits} canUpdate={canUpdate} />
      </Panel>
    </PageStack>
  );
}
