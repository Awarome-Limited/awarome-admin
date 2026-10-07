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
import { formatDate } from '@/lib/format';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSession } from '@/lib/session';
import { hasPermission, PermissionAction, PermissionModule } from '@/lib/permissions';
import type { RiderCollectionCredit } from '@/lib/types';
import { RiderCollectionCredits } from './_components/rider-collection-credits';

const naira = (amount: number) => `₦${Math.round(amount).toLocaleString('en-NG')}`;

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

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-[23px] font-bold tracking-tight text-foreground">Bulk receivables</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          What vendors owe on postpaid bulk drops. Due now is the delivered part.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: 'Due now', value: naira(totals.dueNow) },
          { label: 'Total outstanding', value: naira(totals.outstanding) },
          { label: 'Customers owing', value: customers.length.toLocaleString() },
        ].map((chip) => (
          <div
            key={chip.label}
            className="flex flex-col gap-1 rounded-[12px] border border-border bg-card p-[13px_16px] shadow-[var(--shadow-card)]"
          >
            <span className="text-[12px] font-medium text-muted-foreground">{chip.label}</span>
            <span className="text-[20px] font-bold tabular-nums text-foreground">{chip.value}</span>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Due now</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Drops</TableHead>
                <TableHead>Oldest unpaid delivery</TableHead>
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
                      <div className="text-[12px] text-muted-foreground">
                        {[row.user?.phone, row.user?.email].filter(Boolean).join(' · ')}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {row.dueNow > 0 ? naira(row.dueNow) : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{naira(row.outstanding)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.deliveredDrops}/{row.drops} delivered · {row.bulks}{' '}
                      {row.bulks === 1 ? 'bulk' : 'bulks'}
                    </TableCell>
                    <TableCell>
                      {days == null ? (
                        <span className="text-muted-foreground">Nothing delivered yet</span>
                      ) : (
                        <Badge variant={days >= 7 ? 'destructive' : days >= 2 ? 'warning' : 'secondary'}>
                          {days === 0 ? 'Today' : `${days} ${days === 1 ? 'day' : 'days'}`}
                          {' · '}
                          {formatDate(row.oldestDueSince).split(',')[0]}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.user?._id && (
                        <Link
                          href={`/bulk-deliveries?user=${row.user._id}`}
                          className="text-[13px] font-semibold text-primary hover:underline"
                        >
                          View bulks
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {customers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No vendor owes anything on bulk deliveries.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rider account payments to review ({riderCredits.length})</CardTitle>
          <CardDescription>
            From before riders collected payment themselves: transfers into riders’ pay-in accounts
            that didn’t settle a drop. Credit each to the rider’s wallet (Adjust balance on their page)
            or refund it, then mark it resolved. New transfers into rider accounts fund their wallet
            automatically and never appear here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RiderCollectionCredits credits={riderCredits} canUpdate={canUpdate} />
        </CardContent>
      </Card>
    </div>
  );
}
