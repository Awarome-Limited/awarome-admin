import { notFound } from 'next/navigation';
import { authedFetch, ApiError, SingleResponse } from '@/lib/api-client';
import { AdminTransaction } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { Badge } from '@/components/ui/badge';
import { formatDate, humanize, statusBadgeVariant } from '@/lib/format';
import { DetailHeader, FactList, PageStack, Panel, StatCards } from '@/components/page';

function payerName(user: AdminTransaction['user']) {
  if (!user || typeof user === 'string') return user || 'No name yet';
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'No name yet';
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
    <PageStack>
      <DetailHeader
        back={{ href: '/payments', label: 'All payments' }}
        title={<span className="tabular-nums">{transaction.transactionReference || id.slice(-8)}</span>}
        status={
          <Badge variant={statusBadgeVariant(transaction.status)} dot>
            {humanize(transaction.status)}
          </Badge>
        }
        meta={[humanize(transaction.type), `Initiated ${formatDate(transaction.createdAt)}`]}
      />

      <StatCards
        stats={[
          { label: 'Amount', value: `₦ ${(transaction.amount ?? 0).toLocaleString()}`, meta: transaction.currency },
          { label: 'Customer', value: payerName(transaction.user) },
          { label: 'Paid at', value: transaction.paidAt ? formatDate(transaction.paidAt).split(',')[1]?.trim() ?? '—' : 'Not paid', meta: transaction.paidAt ? formatDate(transaction.paidAt).split(',')[0] : undefined },
        ]}
      />

      <Panel title="Details" className="max-w-2xl">
        <FactList
          columns={2}
          facts={[
            { label: 'Customer', value: payerName(transaction.user) },
            { label: 'Type', value: humanize(transaction.type) },
            { label: 'Channel', value: humanize(transaction.channel) },
            { label: 'Currency', value: transaction.currency || '—' },
            { label: 'Initiated', value: formatDate(transaction.createdAt) },
            { label: 'Paid at', value: formatDate(transaction.paidAt) },
            { label: 'Gateway message', value: transaction.message || '—' },
          ]}
        />
      </Panel>
    </PageStack>
  );
}
