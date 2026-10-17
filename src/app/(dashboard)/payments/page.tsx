import Link from 'next/link';
import { authedFetch, ApiError, PaginatedResponse } from '@/lib/api-client';
import { AdminTransaction } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { SearchBox } from '@/components/search-box';
import { PaginationControls } from '@/components/pagination-controls';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { formatDate, humanize, statusBadgeVariant } from '@/lib/format';
import { buttonVariants } from '@/components/ui/button';
import { SegmentedLinks } from '@/components/segmented';
import {
  EmptyRow,
  ListCard,
  PageHeader,
  PageStack,
  RowChevron,
  RowLink,
  ToolbarEnd,
} from '@/components/page';
import { StatStrip } from '@/components/stat-strip';

const LIMIT = 20;

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'paid', label: 'Paid' },
  { key: 'pending', label: 'Pending' },
  { key: 'failed', label: 'Failed' },
] as const;

function filterToQuery(filter: string): Record<string, string> {
  if (filter !== 'all') return { status: filter };
  return {};
}

function payerName(user: AdminTransaction['user']) {
  if (!user || typeof user === 'string') return user || 'No name yet';
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'No name yet';
}

async function safeCount(url: string): Promise<number> {
  try {
    const r = await authedFetch<PaginatedResponse<unknown>>(url);
    return r.totalCount ?? 0;
  } catch {
    return 0;
  }
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const skip = Number(params.skip ?? 0);
  const search = params.search ?? '';
  const activeFilter = params.filter ?? 'all';
  const filterQ = filterToQuery(activeFilter);

  const query = new URLSearchParams();
  query.set('skip', String(skip));
  query.set('limit', String(LIMIT));
  if (search) query.set('search', search);
  Object.entries(filterQ).forEach(([k, v]) => query.set(k, v));

  let result: PaginatedResponse<AdminTransaction>;
  let totalCount = 0;
  let paidCount = 0;
  let pendingCount = 0;
  let failedCount = 0;

  try {
    [result, totalCount, paidCount, pendingCount, failedCount] = await Promise.all([
      authedFetch<PaginatedResponse<AdminTransaction>>(`/admins/transactions?${query.toString()}`),
      safeCount('/admins/transactions?limit=1'),
      safeCount('/admins/transactions?status=paid&limit=1'),
      safeCount('/admins/transactions?status=pending&limit=1'),
      safeCount('/admins/transactions?status=failed&limit=1'),
    ]);
  } catch (error) {
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Something went wrong.'}
      />
    );
  }

  const chips = [
    { label: 'All transactions', value: totalCount.toLocaleString() },
    { label: 'Paid', value: paidCount.toLocaleString() },
    { label: 'Pending', value: pendingCount.toLocaleString() },
    { label: 'Failed', value: failedCount.toLocaleString() },
  ];

  const tabHref = (key: string) => {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (key !== 'all') p.set('filter', key);
    const q = p.toString();
    return `/payments${q ? `?${q}` : ''}`;
  };
  const tabCounts: Record<string, number> = { all: totalCount, paid: paidCount, pending: pendingCount, failed: failedCount };

  return (
    <PageStack>
      <PageHeader
        title="Payments"
        subtitle="Every payment transaction across the platform: card, transfer and wallet."
        actions={
          <Link href="/payments/wallets" className={buttonVariants({ variant: 'outline' })}>
            Wallets
          </Link>
        }
      />

      <StatStrip stats={chips} />

      <ListCard
        toolbar={
          <>
            <SegmentedLinks
              active={activeFilter}
              items={FILTERS.map((f) => ({
                key: f.key,
                label: f.label,
                href: tabHref(f.key),
                count: tabCounts[f.key]?.toLocaleString(),
              }))}
            />
            <ToolbarEnd>
              <SearchBox placeholder="Reference or customer" />
            </ToolbarEnd>
          </>
        }
        footer={
          <PaginationControls
            skip={skip}
            limit={LIMIT}
            totalCount={result.totalCount}
            basePath="/payments"
            searchParams={params}
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transaction</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.data.map((transaction) => (
              <TableRow key={transaction._id} className="relative">
                <TableCell className="tabular-nums">
                  <RowLink href={`/payments/transactions/${transaction._id}`}>
                    {transaction.transactionReference || transaction._id.slice(-8)}
                  </RowLink>
                  <div className="text-[12.5px] whitespace-nowrap text-muted-foreground">
                    {formatDate(transaction.createdAt)}
                  </div>
                </TableCell>
                <TableCell>{payerName(transaction.user)}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{humanize(transaction.type)}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant(transaction.status)} dot>
                    {humanize(transaction.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  ₦ {(transaction.amount ?? 0).toLocaleString()}
                </TableCell>
                <TableCell>
                  <RowChevron />
                </TableCell>
              </TableRow>
            ))}
            {result.data.length === 0 && (
              <EmptyRow colSpan={6} title="No transactions match" body="Clear the search or switch tabs." />
            )}
          </TableBody>
        </Table>
      </ListCard>
    </PageStack>
  );
}
