import Link from 'next/link';
import { notFound } from 'next/navigation';
import { authedFetch, ApiError, SingleResponse } from '@/lib/api-client';
import { AdminTransaction } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { Badge } from '@/components/ui/badge';
import { formatDate, statusBadgeVariant } from '@/lib/format';

function payerName(user: AdminTransaction['user']) {
  if (!user || typeof user === 'string') return user || '—';
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || '—';
}

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-[13.5px] [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value ?? '—'}</span>
    </div>
  );
}

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let transaction: AdminTransaction;
  try {
    const result = await authedFetch<SingleResponse<AdminTransaction>>(
      `/admins/transactions/${id}`
    );
    transaction = result.data;
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) {
      notFound();
    }
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Something went wrong.'}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/payments"
        className="inline-flex w-fit items-center gap-1.5 rounded-[9px] border border-border-strong bg-card px-3 py-1.5 text-[13px] font-semibold text-foreground-secondary hover:bg-muted"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to payments
      </Link>

      <div className="flex flex-wrap items-center gap-2.5">
        <h1 className="rounded bg-chip px-2 py-0.5 font-mono text-lg font-semibold">
          {transaction.transactionReference || id.slice(-8)}
        </h1>
        <Badge variant={statusBadgeVariant(transaction.status)} dot>
          {transaction.status}
        </Badge>
      </div>

      <div className="max-w-lg rounded-[14px] border border-border bg-card p-[20px_22px] shadow-[var(--shadow-card)]">
        <Row label="Customer" value={payerName(transaction.user)} />
        <Row
          label="Amount"
          value={
            <span className="tabular-nums">
              ₦{(transaction.amount ?? 0).toLocaleString()}
            </span>
          }
        />
        <Row label="Type" value={
          <span className="capitalize">{transaction.type?.replace(/-/g, ' ')}</span>
        } />
        <Row label="Channel" value={transaction.channel} />
        <Row label="Currency" value={transaction.currency} />
        <Row label="Message" value={transaction.message} />
        <Row label="Initiated" value={formatDate(transaction.createdAt)} />
        <Row label="Paid at" value={formatDate(transaction.paidAt)} />
      </div>
    </div>
  );
}
