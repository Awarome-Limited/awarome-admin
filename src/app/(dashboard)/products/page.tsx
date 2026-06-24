import Link from 'next/link';
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
import { cn } from '@/lib/utils';

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
  return `₦${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
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
    { label: 'Total products', value: result.totalCount.toLocaleString() },
    { label: 'In stock', value: inStockCount.toLocaleString() },
    { label: 'Low / out', value: outOfStockCount.toLocaleString() },
    { label: 'Categories', value: categoriesCount.toLocaleString() },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h1 className="text-[23px] font-bold tracking-tight text-foreground">Products</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">Every item listed across vendors</p>
      </div>

      {/* Stat chips */}
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

      {/* Toolbar: filter pills + search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => {
            const active = activeFilter === f.key;
            const href = (() => {
              const p = new URLSearchParams();
              if (search) p.set('search', search);
              if (f.key !== 'all') p.set('filter', f.key);
              const s = p.toString();
              return `/products${s ? `?${s}` : ''}`;
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
        <SearchBox placeholder="Search by product name…" />
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.map((product) => (
                <TableRow key={product._id} className="cursor-pointer">
                  <TableCell>
                    <Link href={`/products/${product._id}`} className="flex items-center gap-3">
                      {product.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.image}
                          alt={product.name}
                          className="size-9 flex-none rounded-[8px] object-cover"
                        />
                      ) : (
                        <div className="flex size-9 flex-none items-center justify-center rounded-[8px] bg-brand-tint text-[11px] font-bold text-primary">
                          {(product.name ?? '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-semibold text-foreground hover:underline">
                        {product.name || '—'}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {productVendorName(product)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {productCategoryName(product)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatPrice(product.price)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {product.quantityAvailable ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.isAvailable ? 'positive' : 'destructive'} dot>
                      {product.isAvailable ? 'In stock' : 'Unavailable'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {result.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No products found.
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
            basePath="/products"
            searchParams={params}
          />
        </div>
      </div>
    </div>
  );
}
