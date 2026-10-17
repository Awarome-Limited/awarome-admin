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
import { formatDate, formatNaira, humanize, statusBadgeVariant } from '@/lib/format';
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
    { label: 'All wallets', value: totalCount.toLocaleString() },
    { label: 'Subscribed', value: subscribedCount.toLocaleString() },
    { label: 'Expired', value: expiredCount.toLocaleString() },
    { label: 'Not subscribed', value: notSubscribedCount.toLocaleString() },
  ];

  const tabHref = (key: string) => {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (key !== 'all') p.set('filter', key);
    const q = p.toString();
    return `/payments/wallets${q ? `?${q}` : ''}`;
  };
  const tabCounts: Record<string, number> = {
    all: totalCount,
    subscribed: subscribedCount,
    expired: expiredCount,
    'not-subscribed': notSubscribedCount,
  };

  return (
    <PageStack>
      <PageHeader
        title="Wallets"
        subtitle="Customer, vendor and partner wallet balances."
        actions={
          <Link href="/payments" className={buttonVariants({ variant: 'outline' })}>
            Transactions
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
              <SearchBox placeholder="Owner name or email" />
            </ToolbarEnd>
          </>
        }
        footer={
          <PaginationControls
            skip={skip}
            limit={LIMIT}
            totalCount={result.totalCount}
            basePath="/payments/wallets"
            searchParams={params}
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Owner</TableHead>
              <TableHead>Subscription</TableHead>
              <TableHead>Last funded</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.data.map((wallet) => {
              const owner = ownerName(wallet);
              const isPartner = !!wallet.partner && typeof wallet.partner !== 'string';
              return (
                <TableRow key={wallet._id} className="relative">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <AvatarInitials name={owner === '—' ? undefined : owner} shape={isPartner ? 'store' : 'person'} />
                      <div className="min-w-0">
                        <RowLink href={`/payments/wallets/${wallet._id}`}>
                          {owner === '—' ? 'No name yet' : owner}
                        </RowLink>
                        <div className="text-[12.5px] text-muted-foreground">{isPartner ? 'API partner' : 'Customer'}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(wallet.subscriptionStatus)} dot>
                      {humanize(wallet.subscriptionStatus)}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-foreground-secondary tabular-nums">
                    {wallet.lastFundedAt ? formatDate(wallet.lastFundedAt) : 'Never'}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatNaira(wallet.balance)}</TableCell>
                  <TableCell>
                    <RowChevron />
                  </TableCell>
                </TableRow>
              );
            })}
            {result.data.length === 0 && (
              <EmptyRow colSpan={5} title="No wallets match" body="Clear the search or switch tabs." />
            )}
          </TableBody>
        </Table>
      </ListCard>
    </PageStack>
  );
}
