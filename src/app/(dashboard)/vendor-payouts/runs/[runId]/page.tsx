import Link from 'next/link';
import { notFound } from 'next/navigation';
import { authedFetch, ApiError, SingleResponse } from '@/lib/api-client';
import { ApiErrorCard } from '@/components/api-error-card';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { formatDate, humanize } from '@/lib/format';
import { buttonVariants } from '@/components/ui/button';
import { StatStrip } from '@/components/stat-strip';
import { DetailHeader, InlineNotice, PageStack } from '@/components/page';
import type { AdminVendorPayoutRun } from '@/lib/types';
import { naira, personName, vendorName } from '../../../payouts/payout-format';

const RUN_STATUS_VARIANT = { running: 'info', completed: 'positive', failed: 'destructive' } as const;

export default async function VendorPayoutRunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;

  let run: AdminVendorPayoutRun;
  try {
    const result = await authedFetch<SingleResponse<AdminVendorPayoutRun>>(`/admins/vendor-payouts/runs/${runId}`);
    run = result.data;
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Something went wrong.'}
      />
    );
  }

  const stats = run.stats ?? { eligible: 0, initiated: 0, failed: 0, skipped: 0, totalAmount: 0 };
  const skipped = run.skipped ?? [];

  return (
    <PageStack>
      <DetailHeader
        back={{ href: '/vendor-payouts', label: 'All vendor payouts' }}
        title={run.trigger === 'scheduled'
                ? `Daily vendor payout · ${run.runKey.replace(/^vendor-/, '')}`
                : 'Manual vendor payout run'}
        status={
          <Badge variant={RUN_STATUS_VARIANT[run.status] ?? 'secondary'} dot>
            {humanize(run.status)}
          </Badge>
        }
        meta={[
          `Started ${formatDate(run.startedAt)} by ${run.initiatedBy ? personName(run.initiatedBy) : 'the scheduler'}`,
          run.finishedAt && `Finished ${formatDate(run.finishedAt)}`,
          `Minimum ${naira(run.minAmount)}`,
        ]}
        actions={
          <Link href={`/vendor-payouts?run=${run._id}`} className={buttonVariants({ variant: 'outline' })}>
            View this run’s payouts
          </Link>
        }
      />

      {run.error && <InlineNotice>{run.error}</InlineNotice>}

      <StatStrip
        stats={[
          { label: 'Owed at least the minimum', value: stats.eligible.toLocaleString() },
          { label: 'Transfers sent', value: stats.initiated.toLocaleString(), meta: naira(stats.totalAmount) },
          { label: 'Failed', value: stats.failed.toLocaleString() },
          { label: 'Skipped', value: stats.skipped.toLocaleString() },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Vendors skipped</CardTitle>
        </CardHeader>
        <CardContent>
          {skipped.length === 0 ? (
            <span className="text-[13.5px] text-muted-foreground">No vendor owed money was skipped.</span>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Why</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {skipped.map((row, index) => (
                    <TableRow key={`${row.vendor?._id ?? 'gone'}-${index}`}>
                      <TableCell>
                        {row.vendor ? (
                          <Link href={`/vendors/${row.vendor._id}`} className="font-medium hover:text-primary">
                            {vendorName(row.vendor)}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">Unknown vendor</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{naira(row.balance)}</TableCell>
                      <TableCell className="text-foreground-secondary">{row.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageStack>
  );
}
