import Link from 'next/link';
import { notFound } from 'next/navigation';
import { authedFetch, ApiError, SingleResponse } from '@/lib/api-client';
import { AdminWallet, AdminWalletTransaction } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { formatDate, formatNaira, statusBadgeVariant } from '@/lib/format';
import { adjustWallet } from '../../actions';

function initials(name?: string) {
  if (!name) return '?';
  return name
    .replace(/[()]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

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

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/payments/wallets"
        className="inline-flex w-fit items-center gap-1.5 rounded-[9px] border border-border-strong bg-card px-3 py-1.5 text-[13px] font-semibold text-foreground-secondary hover:bg-muted"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to wallets
      </Link>

      <div className="flex items-center gap-[14px]">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-brand-tint text-[16px] font-bold text-primary">
          {initials(name)}
        </div>
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">{name}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">Wallet overview and transaction history</p>
        </div>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        <div className="flex flex-col gap-[5px] rounded-[12px] border border-border bg-card p-[14px_16px] shadow-[var(--shadow-card)]">
          <span className="text-[12px] font-medium text-muted-foreground">Current balance</span>
          <span className="text-[22px] font-bold tabular-nums text-primary">
            {formatNaira(wallet.balance)}
          </span>
        </div>
        <div className="flex flex-col gap-2 rounded-[12px] border border-border bg-card p-[14px_16px] shadow-[var(--shadow-card)]">
          <span className="text-[12px] font-medium text-muted-foreground">Subscription</span>
          <Badge
            variant={statusBadgeVariant(wallet.subscriptionStatus)}
            dot
            className="self-start"
          >
            {wallet.subscriptionStatus}
          </Badge>
        </div>
        <div className="flex flex-col gap-[5px] rounded-[12px] border border-border bg-card p-[14px_16px] shadow-[var(--shadow-card)]">
          <span className="text-[12px] font-medium text-muted-foreground">Last funded</span>
          <span className="text-[15px] font-semibold tabular-nums text-foreground">
            {formatDate(wallet.lastFundedAt)}
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="px-[20px] py-[14px] text-[15px] font-semibold text-foreground">
          Transactions
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((entry) => (
                <TableRow key={entry._id}>
                  <TableCell>
                    <Badge variant={entry.type === 'credit' ? 'positive' : 'outline'} dot>
                      {entry.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{entry.description || '—'}</TableCell>
                  <TableCell
                    className={`text-right font-semibold tabular-nums ${
                      entry.type === 'credit' ? 'text-positive' : 'text-foreground'
                    }`}
                  >
                    {entry.type === 'credit' ? '+' : '−'}
                    {formatNaira(entry.amount)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(entry.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
              {history.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    No wallet activity yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="rounded-[14px] border border-border bg-card p-[20px_22px] shadow-[var(--shadow-card)]">
        <div className="mb-4 text-[15px] font-semibold text-foreground">Adjust balance</div>
        <form action={handleAdjust} className="flex flex-col gap-4 sm:max-w-sm">
          <div className="flex flex-col gap-2">
            <Label htmlFor="type">Type</Label>
            <select
              id="type"
              name="type"
              defaultValue="credit"
              className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="credit">Credit (add funds)</option>
              <option value="debit">Debit (remove funds)</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="amount">Amount (₦)</Label>
            <Input id="amount" name="amount" type="number" step="any" min="0" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Reason</Label>
            <Input id="description" name="description" required minLength={3} />
          </div>
          <div>
            <Button type="submit">Apply adjustment</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
