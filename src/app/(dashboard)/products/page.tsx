import { authedFetch, ApiError, PaginatedResponse } from '@/lib/api-client';
import { AdminProduct } from '@/lib/types';
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
import { StatStrip } from '@/components/stat-strip';
import { AvatarInitials } from '@/components/avatar-initials';
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

const LIMIT = 20;

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'in-stock', label: 'In stock' },
  { key: 'out-of-stock', label: 'Out of stock' },
] as const;

function filterToQuery(filter: string): Record<string, string> {
  if (filter === 'in-stock') return { isAvailable: 'true' };
  if (filter === 'out-of-stock') return { isAvailable: 'false' };
  return {};
}

function formatPrice(price?: number) {
  if (price === undefined || price === null) return '—';
  return `₦ ${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function productVendorName(product: AdminProduct): string {
  if (!product.vendor) return '—';
  if (typeof product.vendor === 'string') return product.vendor;
  return product.vendor.businessName || product.vendor.name || '—';
}

function productCategoryName(product: AdminProduct): string {
  if (!product.category) return '—';
  if (typeof product.category === 'string') return product.category;
  return product.category.name || '—';
}

async function safeCount(url: string): Promise<number> {
  try {
    const r = await authedFetch<PaginatedResponse<unknown>>(url);
    return r.totalCount ?? 0;
  } catch {
    return 0;
  }
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const skip = Number(params.skip ?? 0);
  const search = params.search ?? '';
  const activeFilter = (params.filter ?? 'all') as string;
  const filterQ = filterToQuery(activeFilter);

  const query = new URLSearchParams();
  query.set('skip', String(skip));
  query.set('limit', String(LIMIT));
  if (search) query.set('search', search);
  Object.entries(filterQ).forEach(([k, v]) => query.set(k, v));

  let result: PaginatedResponse<AdminProduct>;
  let inStockCount = 0;
  let outOfStockCount = 0;
  let categoriesCount = 0;

  try {
    [result, inStockCount, outOfStockCount, categoriesCount] = await Promise.all([
      authedFetch<PaginatedResponse<AdminProduct>>(`/products/admin?${query.toString()}`),
      safeCount('/products/admin?isAvailable=true&limit=1'),
      safeCount('/products/admin?isAvailable=false&limit=1'),
      safeCount('/products/categories?limit=1'),
    ]);
  } catch (error) {
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Something went wrong.'}
      />
    );
  }

  const chips = [
    { label: 'All products', value: result.totalCount.toLocaleString() },
    { label: 'In stock', value: inStockCount.toLocaleString() },
    { label: 'Unavailable', value: outOfStockCount.toLocaleString() },
    { label: 'Categories', value: categoriesCount.toLocaleString() },
  ];

  const tabHref = (key: string) => {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (key !== 'all') p.set('filter', key);
    const q = p.toString();
    return `/products${q ? `?${q}` : ''}`;
  };

  return (
    <PageStack>
      <PageHeader title="Products" subtitle="Every item listed across vendors." />

      <StatStrip stats={chips} />

      <ListCard
        toolbar={
          <>
            <SegmentedLinks
              active={activeFilter}
              items={FILTERS.map((f) => ({ key: f.key, label: f.label, href: tabHref(f.key) }))}
            />
            <ToolbarEnd>
              <SearchBox placeholder="Product name" />
            </ToolbarEnd>
          </>
        }
        footer={
          <PaginationControls
            skip={skip}
            limit={LIMIT}
            totalCount={result.totalCount}
            basePath="/products"
            searchParams={params}
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Store</TableHead>
              <TableHead>Availability</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.data.map((product) => (
              <TableRow key={product._id} className="relative">
                <TableCell className="max-w-[360px]">
                  <div className="flex min-w-0 items-center gap-3">
                    {product.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.image}
                        alt=""
                        className="size-[38px] flex-none rounded-[8px] border border-border object-cover"
                      />
                    ) : (
                      <AvatarInitials name={product.name || undefined} shape="store" />
                    )}
                    <div className="min-w-0">
                      <RowLink href={`/products/${product._id}`} className="block truncate">
                        {product.name || 'Untitled product'}
                      </RowLink>
                      <div className="truncate text-[12.5px] text-muted-foreground">{productCategoryName(product)}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="max-w-[220px] truncate text-foreground-secondary">
                  {productVendorName(product)}
                </TableCell>
                <TableCell>
                  <Badge variant={product.isAvailable ? 'positive' : 'destructive'} dot>
                    {product.isAvailable ? 'In stock' : 'Unavailable'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-foreground-secondary tabular-nums">
                  {product.quantityAvailable?.toLocaleString() ?? '—'}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">{formatPrice(product.price)}</TableCell>
                <TableCell>
                  <RowChevron />
                </TableCell>
              </TableRow>
            ))}
            {result.data.length === 0 && (
              <EmptyRow colSpan={6} title="No products match" body="Clear the search or switch tabs." />
            )}
          </TableBody>
        </Table>
      </ListCard>
    </PageStack>
  );
}
