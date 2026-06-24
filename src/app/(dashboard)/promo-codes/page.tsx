import Link from 'next/link';
import { authedFetch, ApiError, PaginatedResponse } from '@/lib/api-client';
import { AdminPromoCode } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { SearchBox } from '@/components/search-box';
import { PaginationControls } from '@/components/pagination-controls';
import { PromoCodeActiveToggle } from '@/components/promo-code-active-toggle';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { togglePromoCodeActive } from './actions';
import { CreatePromoDialog } from './_components/create-promo-dialog';

const LIMIT = 20;

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'expired', label: 'Expired' },
] as const;

function filterToQuery(filter: string): Record<string, string> {
  if (filter === 'active') return { isActive: 'true' };
  if (filter === 'expired') return { isActive: 'false' };
  return {};
}

function formatDiscount(promo: AdminPromoCode) {
  return promo.discountType === 'percentage'
    ? `${promo.discountValue}%`
    : `₦${promo.discountValue.toLocaleString()}`;
}

async function safeCount(url: string): Promise<number> {
  try {
    const r = await authedFetch<PaginatedResponse<unknown>>(url);
    return r.totalCount ?? 0;
  } catch {
    return 0;
  }
}

export default async function PromoCodesPage({
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

  let result: PaginatedResponse<AdminPromoCode>;
  let totalCount = 0;
  let activeCount = 0;
  let inactiveCount = 0;

  try {
    [result, totalCount, activeCount, inactiveCount] = await Promise.all([
      authedFetch<PaginatedResponse<AdminPromoCode>>(`/promo-codes?${query.toString()}`),
      safeCount('/promo-codes?limit=1'),
      safeCount('/promo-codes?isActive=true&limit=1'),
      safeCount('/promo-codes?isActive=false&limit=1'),
    ]);
  } catch (error) {
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Something went wrong.'}
      />
    );
  }

  const totalRedemptions = result.data.reduce((sum, p) => sum + (p.usedCount ?? 0), 0);

  const chips = [
    { label: 'Active codes', value: activeCount.toLocaleString() },
    { label: 'Total codes', value: totalCount.toLocaleString() },
    { label: 'Total redemptions', value: totalRedemptions.toLocaleString() },
    { label: 'Expired / inactive', value: inactiveCount.toLocaleString() },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[23px] font-bold tracking-tight text-foreground">Promo codes</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Discount codes and their redemption history
          </p>
        </div>
        <CreatePromoDialog />
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
              return `/promo-codes${s ? `?${s}` : ''}`;
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
        <SearchBox placeholder="Search by code…" />
      </div>

      <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Applies to</TableHead>
                <TableHead className="text-right">Uses</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.map((promo) => (
                <TableRow key={promo._id}>
                  <TableCell>
                    <Link
                      href={`/promo-codes/${promo._id}`}
                      className="rounded bg-chip px-2 py-0.5 font-mono text-xs hover:underline"
                    >
                      {promo.code}
                    </Link>
                  </TableCell>
                  <TableCell className="font-semibold">{formatDiscount(promo)}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">
                    {promo.applicability || '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {promo.usedCount ?? 0}
                    {promo.usageLimit ? ` / ${promo.usageLimit}` : ''}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {promo.expiryDate ? formatDate(promo.expiryDate).split(',')[0] : '—'}
                  </TableCell>
                  <TableCell>
                    <PromoCodeActiveToggle
                      isActive={promo.isActive}
                      action={togglePromoCodeActive.bind(null, promo._id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {result.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No promo codes found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="border-t border-border px-4 py-3">
          <PaginationControls
            skip={result.skip}
            limit={result.limit || LIMIT}
            totalCount={result.totalCount}
            basePath="/promo-codes"
            searchParams={params}
          />
        </div>
      </div>
    </div>
  );
}
