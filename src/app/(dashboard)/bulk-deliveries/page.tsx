import Link from 'next/link';
import { PlusIcon } from 'lucide-react';
import { authedFetch, ApiError, PaginatedResponse } from '@/lib/api-client';
import { getSession } from '@/lib/session';
import { hasPermission, PermissionAction, PermissionModule } from '@/lib/permissions';
import type { AdminBulkDelivery } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { PaginationControls } from '@/components/pagination-controls';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { formatDate } from '@/lib/format';

const LIMIT = 20;

const naira = (amount: number) => `₦${Math.round(amount).toLocaleString('en-NG')}`;

function customerName(user: AdminBulkDelivery['user']) {
  if (!user || typeof user === 'string') return user || '—';
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || '—';
}

export default async function BulkDeliveriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const skip = Number(params.skip ?? 0);
  const session = await getSession();
  const canCreate =
    !!session &&
    hasPermission(session.profile, PermissionModule.DELIVERIES, PermissionAction.CREATE);

  let result: PaginatedResponse<AdminBulkDelivery>;
  try {
    result = await authedFetch<PaginatedResponse<AdminBulkDelivery>>(
      `/bulk-deliveries?skip=${skip}&limit=${LIMIT}${params.user ? `&user=${encodeURIComponent(params.user)}` : ''}`
    );
  } catch (error) {
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Something went wrong.'}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[23px] font-bold tracking-tight text-foreground">Bulk deliveries</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Drops booked on a customer’s behalf from offline requests
          </p>
        </div>
        {canCreate && (
          <Link href="/bulk-deliveries/new" className={buttonVariants({ size: 'sm' })}>
            <PlusIcon data-icon="inline-start" />
            New bulk delivery
          </Link>
        )}
      </div>

      <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bulk</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Pricing</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Vendor owes</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.map((bulk) => {
                const { summary } = bulk;
                const done = summary.drops - summary.cancelled;
                return (
                  <TableRow key={bulk._id}>
                    <TableCell>
                      <Link
                        href={`/bulk-deliveries/${bulk._id}`}
                        className="rounded bg-chip px-2 py-0.5 font-mono text-xs hover:underline"
                      >
                        {bulk.bulkId}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">{customerName(bulk.user)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={summary.delivered === done && done > 0 ? 'positive' : 'warning'}
                        dot
                      >
                        {summary.delivered}/{done} delivered
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {bulk.pricingMode === 'flat' ? 'Flat rate' : 'Standard'}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {naira(summary.totalFees)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {summary.vendor.outstanding > 0 ? (
                        <span className="font-semibold text-warning">
                          {naira(summary.vendor.outstanding)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {summary.vendor.drops ? 'Settled' : '—'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(bulk.createdAt).split(',')[0]}
                    </TableCell>
                  </TableRow>
                );
              })}
              {result.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No bulk deliveries yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="border-t border-border px-4 py-3">
          <PaginationControls
            skip={skip}
            limit={LIMIT}
            totalCount={result.totalCount}
            basePath="/bulk-deliveries"
            searchParams={params}
          />
        </div>
      </div>
    </div>
  );
}
