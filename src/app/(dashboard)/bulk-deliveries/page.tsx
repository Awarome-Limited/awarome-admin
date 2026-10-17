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
import { StatStrip } from '@/components/stat-strip';
import {
  EmptyRow,
  ListCard,
  PageHeader,
  PageStack,
  RowChevron,
  RowLink,
} from '@/components/page';

const LIMIT = 20;

const naira = (amount: number) => `₦ ${Math.round(amount).toLocaleString('en-NG')}`;

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

  const outstanding = result.data.reduce((sum, b) => sum + (b.summary.vendor.outstanding ?? 0), 0);
  const inProgress = result.data.filter((b) => {
    const done = b.summary.drops - b.summary.cancelled;
    return b.summary.delivered < done;
  }).length;

  return (
    <PageStack>
      <PageHeader
        title="Bulk deliveries"
        subtitle="Drops booked on a customer’s behalf from offline requests."
        actions={
          canCreate && (
            <Link href="/bulk-deliveries/new" className={buttonVariants()}>
              <PlusIcon />
              New bulk delivery
            </Link>
          )
        }
      />

      <StatStrip
        stats={[
          { label: 'Bulk bookings', value: result.totalCount.toLocaleString() },
          { label: 'Still delivering', value: inProgress.toLocaleString(), meta: 'On this page' },
          { label: 'Vendors still owe', value: naira(outstanding), meta: 'On this page' },
        ]}
      />

      <ListCard
        footer={
          <PaginationControls
            skip={skip}
            limit={LIMIT}
            totalCount={result.totalCount}
            basePath="/bulk-deliveries"
            searchParams={params}
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bulk</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Pricing</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Vendor owes</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.data.map((bulk) => {
              const { summary } = bulk;
              const done = summary.drops - summary.cancelled;
              const pct = done > 0 ? summary.delivered / done : 0;
              return (
                <TableRow key={bulk._id} className="relative">
                  <TableCell className="tabular-nums">
                    <RowLink href={`/bulk-deliveries/${bulk._id}`}>{bulk.bulkId}</RowLink>
                    <div className="text-[12.5px] whitespace-nowrap text-muted-foreground">
                      {formatDate(bulk.createdAt)}
                    </div>
                  </TableCell>
                  <TableCell>{customerName(bulk.user)}</TableCell>
                  <TableCell className="min-w-[160px]">
                    <div className="flex items-center gap-2.5">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                        <div
                          className={pct >= 1 ? 'h-full rounded-full bg-positive' : 'h-full rounded-full bg-primary'}
                          style={{ width: `${pct * 100}%` }}
                        />
                      </div>
                      <span className="text-[13px] text-foreground-secondary tabular-nums">
                        {summary.delivered} of {done}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{bulk.pricingMode === 'flat' ? 'Flat rate' : 'Standard'}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{naira(summary.totalFees)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {summary.vendor.outstanding > 0 ? (
                      <span className="font-medium text-warning">{naira(summary.vendor.outstanding)}</span>
                    ) : (
                      <span className="text-muted-foreground">{summary.vendor.drops ? 'Settled' : '—'}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <RowChevron />
                  </TableCell>
                </TableRow>
              );
            })}
            {result.data.length === 0 && (
              <EmptyRow
                colSpan={7}
                title="No bulk deliveries yet"
                body="Book a customer’s drops in one go from an offline request."
              />
            )}
          </TableBody>
        </Table>
      </ListCard>
    </PageStack>
  );
}
