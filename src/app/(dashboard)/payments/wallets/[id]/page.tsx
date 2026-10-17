import { notFound } from 'next/navigation';
import { authedFetch, ApiError, SingleResponse } from '@/lib/api-client';
import { AdminWallet, AdminWalletTransaction } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { Badge } from '@/components/ui/badge';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { formatDate, formatNaira, humanize, statusBadgeVariant } from '@/lib/format';
import { AvatarInitials } from '@/components/avatar-initials';
import { DetailHeader, EmptyRow, Field, PageStack, Panel, StatCards } from '@/components/page';
import { adjustWallet } from '../../actions';

function ownerName(wallet: AdminWallet) {
  if (wallet.user && typeof wallet.user !== 'string') {
    return (
      [wallet.user.firstName, wallet.user.lastName].filter(Boolean).join(' ') ||
      wallet.user.email ||
      '—'
    );
  }
  if (wallet.partner && typeof wallet.partner !== 'string') {
    return wallet.partner.name || '—';
  }
  return '—';
}

export default async function WalletDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let wallet: AdminWallet;
  let history: AdminWalletTransaction[];
  try {
    const result = await authedFetch<
      SingleResponse<{ wallet: AdminWallet; history: AdminWalletTransaction[] }>
    >(`/admins/wallets/${id}`);
    wallet = result.data.wallet;
    history = result.data.history;
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

  const name = ownerName(wallet);

  async function handleAdjust(formData: FormData) {
    'use server';
    const amount = Number(formData.get('amount'));
    const type = formData.get('type')?.toString() as 'credit' | 'debit';
    const description = formData.get('description')?.toString() || '';
    if (amount > 0 && type) {
      await adjustWallet(id, { amount, type, description });
    }
  }

  const isPartner = !!wallet.partner && typeof wallet.partner !== 'string';
  const credits = history.filter((e) => e.type === 'credit').reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const debits = history.filter((e) => e.type !== 'credit').reduce((sum, e) => sum + (e.amount ?? 0), 0);

  return (
    <PageStack>
      <DetailHeader
        back={{ href: '/payments/wallets', label: 'All wallets' }}
        avatar={<AvatarInitials name={name === '—' ? undefined : name} size="lg" shape={isPartner ? 'store' : 'person'} />}
        title={name === '—' ? 'No name yet' : name}
        status={
          <Badge variant={statusBadgeVariant(wallet.subscriptionStatus)} dot>
            {humanize(wallet.subscriptionStatus)}
          </Badge>
        }
        meta={[isPartner ? 'API partner wallet' : 'Customer wallet']}
      />

      <StatCards
        stats={[
          { label: 'Current balance', value: formatNaira(wallet.balance) },
          { label: 'Credits shown', value: formatNaira(credits), meta: `${history.filter((e) => e.type === 'credit').length} entries` },
          { label: 'Debits shown', value: formatNaira(debits), meta: `${history.filter((e) => e.type !== 'credit').length} entries` },
          { label: 'Last funded', value: wallet.lastFundedAt ? formatDate(wallet.lastFundedAt).split(',')[0] : 'Never' },
        ]}
      />

      <section className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel flush title="Activity">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entry</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((entry) => (
                  <TableRow key={entry._id}>
                    <TableCell>
                      <Badge variant={entry.type === 'credit' ? 'positive' : 'secondary'} dot={entry.type === 'credit'}>
                        {humanize(entry.type)}
                      </Badge>
                      <div className="mt-1 text-[12.5px] whitespace-nowrap text-muted-foreground tabular-nums">
                        {formatDate(entry.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground-secondary">{entry.description || '—'}</TableCell>
                    <TableCell
                      className={
                        entry.type === 'credit'
                          ? 'text-right font-medium text-positive tabular-nums'
                          : 'text-right font-medium tabular-nums'
                      }
                    >
                      {entry.type === 'credit' ? '+' : '−'}
                      {formatNaira(entry.amount)}
                    </TableCell>
                  </TableRow>
                ))}
                {history.length === 0 && (
                  <EmptyRow colSpan={3} title="No wallet activity yet" body="Funding, charges and adjustments show up here." />
                )}
              </TableBody>
            </Table>
          </div>
        </Panel>

        <aside className="lg:sticky lg:top-6">
          <Panel
            title="Adjust balance"
            description="Credits add money, debits remove it. The reason is saved with the entry and in the activity log."
          >
            <form action={handleAdjust} className="flex flex-col gap-4">
              <Field label="Type" htmlFor="type">
                <select id="type" name="type" defaultValue="credit" className="field pr-9">
                  <option value="credit">Credit (add funds)</option>
                  <option value="debit">Debit (remove funds)</option>
                </select>
              </Field>
              <Field label="Amount" htmlFor="amount">
                <div className="field-wrap">
                  <span>₦</span>
                  <input
                    id="amount"
                    name="amount"
                    type="number"
                    step="any"
                    min="0"
                    required
                    className="w-full border-0 bg-transparent text-foreground tabular-nums outline-none"
                  />
                </div>
              </Field>
              <Field label="Reason" htmlFor="description" help="At least 3 characters.">
                <Input id="description" name="description" required minLength={3} />
              </Field>
              <SubmitButton pendingLabel="Applying…" className="w-full">
                Apply adjustment
              </SubmitButton>
            </form>
          </Panel>
        </aside>
      </section>
    </PageStack>
  );
}
