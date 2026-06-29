import Link from 'next/link';
import { authedFetch, ApiError, PaginatedResponse } from '@/lib/api-client';
import { AdminCart } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { SearchBox } from '@/components/search-box';
import { PaginationControls } from '@/components/pagination-controls';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { formatDate } from '@/lib/format';

const LIMIT = 20;

function userName(user: AdminCart['user']) {
  if (!user || typeof user === 'string') return user || '—';
  const full = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return full || user.email || '—';
}

function userId(user: AdminCart['user']): string | null {
  if (!user) return null;
  return typeof user === 'string' ? user : user._id;
}

function productName(product: AdminCart['product']) {
  if (!product || typeof product === 'string') return product || '—';
  return product.name || '—';
}

function productId(product: AdminCart['product']): string | null {
  if (!product) return null;
  return typeof product === 'string' ? product : product._id;
}

function vendorName(vendor: AdminCart['vendor']) {
  if (!vendor || typeof vendor === 'string') return vendor || '—';
  return vendor.businessName || vendor.name || '—';
}

async function safeCount(url: string): Promise<number> {
  try {
    const r = await authedFetch<PaginatedResponse<unknown>>(url);
    return r.totalCount ?? 0;
  } catch {
    return 0;
  }
}

export default async function CartsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const skip = Number(params.skip ?? 0);
  const search = params.search ?? '';

  const query = new URLSearchParams();
  query.set('skip', String(skip));
  query.set('limit', String(LIMIT));
  if (search) query.set('search', search);

  let result: PaginatedResponse<AdminCart>;
  let totalCount = 0;

  try {
    [result, totalCount] = await Promise.all([
      authedFetch<PaginatedResponse<AdminCart>>(`/admins/carts?${query.toString()}`),
      safeCount('/admins/carts?limit=1'),
    ]);
  } catch (error) {
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Something went wrong.'}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-[23px] font-bold tracking-tight text-foreground">Carts</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Items customers have added to their cart
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-[12px] border border-border bg-card p-[13px_16px] shadow-[var(--shadow-card)]">
          <span className="text-[12px] font-medium text-muted-foreground">Total cart items</span>
          <span className="text-[20px] font-bold tabular-nums text-foreground">
            {totalCount.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <SearchBox placeholder="Search by customer or product…" />
      </div>

      <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-48 min-w-[12rem]">Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit price</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead>Added</TableHead>
                <TableHead>Last updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.map((cart) => {
                const uid = userId(cart.user);
                const pid = productId(cart.product);
                const qty = cart.quantity ?? 0;
                const price = cart.price ?? 0;

                return (
                  <TableRow key={cart._id}>
                    <TableCell className="font-medium">
                      {uid ? (
                        <Link
                          href={`/users/${uid}`}
                          className="hover:underline"
                        >
                          {userName(cart.user)}
                        </Link>
                      ) : (
                        userName(cart.user)
                      )}
                    </TableCell>
                    <TableCell>
                      {pid ? (
                        <Link
                          href={`/products/${pid}`}
                          className="hover:underline"
                        >
                          {productName(cart.product)}
                        </Link>
                      ) : (
                        productName(cart.product)
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {vendorName(cart.vendor)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{qty}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {price ? `₦${price.toLocaleString()}` : '—'}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {price && qty ? `₦${(price * qty).toLocaleString()}` : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(cart.createdAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(cart.updatedAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
              {result.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    No cart items found.
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
            basePath="/carts"
            searchParams={params}
          />
        </div>
      </div>
    </div>
  );
}
