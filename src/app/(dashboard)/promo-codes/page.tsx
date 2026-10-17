import { authedFetch, ApiError, PaginatedResponse } from '@/lib/api-client';
import { AdminPromoCode } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { SearchBox } from '@/components/search-box';
import { PaginationControls } from '@/components/pagination-controls';
import { PromoStatusPill } from '@/components/promo-code-active-toggle';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { formatDate, humanize } from '@/lib/format';
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
import { CreatePromoDialog } from './_components/create-promo-dialog';
import { StatStrip } from '@/components/stat-strip';

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
    : `₦ ${promo.discountValue.toLocaleString()}`;
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
    { label: 'All codes', value: totalCount.toLocaleString() },
    { label: 'Off or expired', value: inactiveCount.toLocaleString() },
    { label: 'Redemptions shown', value: totalRedemptions.toLocaleString(), meta: 'Codes on this page' },
  ];

  const tabHref = (key: string) => {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (key !== 'all') p.set('filter', key);
    const q = p.toString();
    return `/promo-codes${q ? `?${q}` : ''}`;
  };

  return (
    <PageStack>
      <PageHeader
        title="Promo codes"
        subtitle="Discount codes customers can use at checkout, and how often they’re redeemed."
        actions={<CreatePromoDialog />}
      />

      <StatStrip stats={chips} />

      <ListCard
        toolbar={
          <>
            <SegmentedLinks
              active={activeFilter}
              items={FILTERS.map((f) => ({ key: f.key, label: f.label, href: tabHref(f.key) }))}
            />
            <ToolbarEnd>
              <SearchBox placeholder="Code" />
            </ToolbarEnd>
          </>
        }
        footer={
          <PaginationControls
            skip={skip}
            limit={LIMIT}
            totalCount={result.totalCount}
            basePath="/promo-codes"
            searchParams={params}
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Applies to</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="text-right">Uses</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.data.map((promo) => {
              const nearlyUsed = promo.usageLimit && (promo.usedCount ?? 0) / promo.usageLimit >= 0.9;
              return (
                <TableRow key={promo._id} className="relative">
                  <TableCell>
                    <RowLink href={`/promo-codes/${promo._id}`} className="tracking-[0.02em] uppercase">
                      {promo.code}
                    </RowLink>
                    <div className="text-[12.5px] text-muted-foreground">{formatDiscount(promo)}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{humanize(promo.applicability)}</Badge>
                  </TableCell>
                  <TableCell>
                    <PromoStatusPill isActive={promo.isActive} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-foreground-secondary tabular-nums">
                    {promo.expiryDate ? formatDate(promo.expiryDate).split(',')[0] : 'Never'}
                  </TableCell>
                  <TableCell className={nearlyUsed ? 'text-right font-medium text-warning tabular-nums' : 'text-right tabular-nums'}>
                    {(promo.usedCount ?? 0).toLocaleString()}
                    {promo.usageLimit ? ` of ${promo.usageLimit.toLocaleString()}` : ''}
                  </TableCell>
                  <TableCell>
                    <RowChevron />
                  </TableCell>
                </TableRow>
              );
            })}
            {result.data.length === 0 && (
              <EmptyRow colSpan={6} title="No promo codes match" body="Clear the search or switch tabs, or create a code." />
            )}
          </TableBody>
        </Table>
      </ListCard>
    </PageStack>
  );
}
