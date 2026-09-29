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
import { formatDate } from '@/lib/format';
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
    <div className="flex flex-col gap-4">
      <Link
        href="/vendor-payouts"
        className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-border-strong bg-card px-3 py-1.5 text-[13px] font-semibold text-foreground-secondary hover:bg-muted"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5 M12 19l-7-7 7-7"/></svg>
        Back to vendor payouts
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[23px] font-bold tracking-tight">
              {run.trigger === 'scheduled'
                ? `Daily vendor payout · ${run.runKey.replace(/^vendor-/, '')}`
                : 'Manual vendor payout run'}
            </h1>
            <Badge variant={RUN_STATUS_VARIANT[run.status] ?? 'secondary'} dot className="capitalize">
              {run.status}
            </Badge>
          </div>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            Started {formatDate(run.startedAt)} by {run.initiatedBy ? personName(run.initiatedBy) : 'the scheduler'}
            {run.finishedAt ? ` · finished ${formatDate(run.finishedAt)}` : ''} · minimum {naira(run.minAmount)}
          </p>
        </div>
        <Link
          href={`/vendor-payouts?run=${run._id}`}
          className="inline-flex h-8 items-center rounded-lg border border-border-strong bg-card px-3 text-[13px] font-semibold text-foreground-secondary hover:bg-muted"
        >
          View this run&apos;s payouts
        </Link>
      </div>

      {run.error && (
        <div className="rounded-[12px] border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
          {run.error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: 'Owed ≥ minimum', value: stats.eligible.toLocaleString() },
          { label: 'Transfers sent', value: stats.initiated.toLocaleString() },
          { label: 'Amount sent', value: naira(stats.totalAmount) },
          { label: 'Failed', value: stats.failed.toLocaleString() },
          { label: 'Skipped', value: stats.skipped.toLocaleString() },
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

      <Card>
        <CardHeader>
          <CardTitle>Vendors skipped</CardTitle>
        </CardHeader>
        <CardContent>
          {skipped.length === 0 ? (
            <span className="text-[13px] text-muted-foreground">No vendor owed money was skipped.</span>
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
                          <Link href={`/vendors/${row.vendor._id}`} className="font-medium hover:underline">
                            {vendorName(row.vendor)}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">Unknown vendor</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{naira(row.balance)}</TableCell>
                      <TableCell className="text-muted-foreground">{row.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
