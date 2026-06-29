import Link from 'next/link';
import { authedFetch, ApiError, PaginatedResponse } from '@/lib/api-client';
import { AdminWallet } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { SearchBox } from '@/components/search-box';
import { PaginationControls } from '@/components/pagination-controls';
import { AvatarInitials } from '@/components/avatar-initials';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { formatDate, formatNaira, statusBadgeVariant } from '@/lib/format';
import { cn } from '@/lib/utils';

const LIMIT = 20;

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'subscribed', label: 'Subscribed' },
  { key: 'expired', label: 'Expired' },
  { key: 'not-subscribed', label: 'Not subscribed' },
] as const;

function filterToQuery(filter: string): Record<string, string> {
  if (filter !== 'all') return { subscriptionStatus: filter };
  return {};
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

async function safeCount(url: string): Promise<number> {
  try {
    const r = await authedFetch<PaginatedResponse<unknown>>(url);
    return r.totalCount ?? 0;
  } catch {
    return 0;
  }
}

export default async function WalletsPage({
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

  let result: PaginatedResponse<AdminWallet>;
  let totalCount = 0;
  let subscribedCount = 0;
  let expiredCount = 0;
  let notSubscribedCount = 0;

  try {
    [result, totalCount, subscribedCount, expiredCount, notSubscribedCount] = await Promise.all([
      authedFetch<PaginatedResponse<AdminWallet>>(`/admins/wallets?${query.toString()}`),
      safeCount('/admins/wallets?limit=1'),
      safeCount('/admins/wallets?subscriptionStatus=subscribed&limit=1'),
      safeCount('/admins/wallets?subscriptionStatus=expired&limit=1'),
      safeCount('/admins/wallets?subscriptionStatus=not-subscribed&limit=1'),
    ]);
  } catch (error) {
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Something went wrong.'}
      />
    );
  }

  const chips = [
    { label: 'Total wallets', value: totalCount.toLocaleString() },
    { label: 'Subscribed', value: subscribedCount.toLocaleString() },
    { label: 'Expired', value: expiredCount.toLocaleString() },
    { label: 'Not subscribed', value: notSubscribedCount.toLocaleString() },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[23px] font-bold tracking-tight text-foreground">Wallets</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Customer and vendor wallet balances
          </p>
        </div>
        <Link
          href="/payments"
          className="inline-flex h-[34px] items-center gap-1.5 rounded-[9px] border border-border-strong bg-card px-3.5 text-[13px] font-semibold text-foreground-secondary hover:bg-muted"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 6h20v12H2zM2 10h20" />
          </svg>
          Transactions
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
              return `/payments/wallets${s ? `?${s}` : ''}`;
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
        <SearchBox placeholder="Search by owner…" />
      </div>

      <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Last funded</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.map((wallet) => (
                <TableRow key={wallet._id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <AvatarInitials name={ownerName(wallet)} size="sm" />
                      <span className="font-medium text-foreground">{ownerName(wallet)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-foreground">
                    {formatNaira(wallet.balance)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(wallet.subscriptionStatus)} dot>
                      {wallet.subscriptionStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(wallet.lastFundedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/payments/wallets/${wallet._id}`}
                      className="inline-flex h-[30px] items-center rounded-[8px] border border-border-strong bg-card px-3 text-[12.5px] font-semibold text-foreground-secondary hover:bg-muted"
                    >
                      View wallet
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {result.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No wallets found.
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
            basePath="/payments/wallets"
            searchParams={params}
          />
        </div>
      </div>
    </div>
  );
}
