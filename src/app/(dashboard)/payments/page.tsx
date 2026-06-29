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
import { formatDate, statusBadgeVariant } from '@/lib/format';
import { cn } from '@/lib/utils';

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
  if (!user || typeof user === 'string') return user || '—';
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || '—';
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
    { label: 'Total transactions', value: totalCount.toLocaleString() },
    { label: 'Paid', value: paidCount.toLocaleString() },
    { label: 'Pending', value: pendingCount.toLocaleString() },
    { label: 'Failed', value: failedCount.toLocaleString() },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[23px] font-bold tracking-tight text-foreground">Payments</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Payment transactions across the platform
          </p>
        </div>
        <Link
          href="/payments/wallets"
          className="inline-flex h-[34px] items-center gap-1.5 rounded-[9px] border border-border-strong bg-card px-3.5 text-[13px] font-semibold text-foreground-secondary hover:bg-muted"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6a2 2 0 0 1 2-2h12v4M3 6v12a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4M22 9v4h-5a2 2 0 0 1 0-4z" />
          </svg>
          Wallets
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {chips.map((chip) => (
          <div
            key={chip.label}
            className="flex flex-col gap-1 rounded-[12px] border border-border bg-card p-[13px_16px] shadow-[var(--shadow-card)]"
          >
            <span className="text-[12px] font-medium text-muted-foreground">{chip.label}</span>
            <span className="text-[20px] font-bold tabular-nums text-foreground">{chip.value}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => {
            const active = activeFilter === f.key;
            const href = (() => {
              const p = new URLSearchParams();
              if (search) p.set('search', search);
              if (f.key !== 'all') p.set('filter', f.key);
              const s = p.toString();
              return `/payments${s ? `?${s}` : ''}`;
            })();
            return (
              <Link
                key={f.key}
                href={href}
                className={cn(
                  'rounded-[9px] border px-3.5 py-[7px] text-[13px] font-semibold transition-colors',
                  active
                    ? 'border-transparent bg-brand-tint text-primary'
                    : 'border-border-strong bg-card text-foreground-secondary hover:bg-muted'
                )}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-[34px] items-center gap-1.5 rounded-[9px] border border-border-strong bg-card px-3.5 text-[13px] font-semibold text-foreground-secondary hover:bg-muted"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Export
          </button>
          <SearchBox placeholder="Search by reference or customer…" />
        </div>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.map((transaction) => (
                <TableRow key={transaction._id} className="cursor-pointer">
                  <TableCell>
                    <Link
                      href={`/payments/transactions/${transaction._id}`}
                      className="rounded bg-chip px-2 py-0.5 font-mono text-xs hover:underline"
                    >
                      {transaction.transactionReference || transaction._id.slice(-8)}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">{payerName(transaction.user)}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">
                    {transaction.type?.replace(/-/g, ' ') || '—'}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    ₦{(transaction.amount ?? 0).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(transaction.status)} dot>
                      {transaction.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(transaction.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
              {result.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No transactions found.
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
            basePath="/payments"
            searchParams={params}
          />
        </div>
      </div>
    </div>
  );
}
