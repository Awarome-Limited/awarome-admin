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
import { StatStrip } from '@/components/stat-strip';
import { EmptyRow, ListCard, PageHeader, PageStack } from '@/components/page';

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

  const pageValue = result.data.reduce((sum, c) => sum + (c.price ?? 0) * (c.quantity ?? 0), 0);

  return (
    <PageStack>
      <PageHeader title="Carts" subtitle="Items customers have added to their cart but not checked out yet." />

      <StatStrip
        stats={[
          { label: 'Items in carts', value: totalCount.toLocaleString() },
          { label: 'Value shown', value: `₦ ${pageValue.toLocaleString()}`, meta: 'Items on this page' },
        ]}
      />

      <ListCard
        toolbar={<SearchBox placeholder="Customer or product" />}
        footer={
          <PaginationControls
            skip={skip}
            limit={LIMIT}
            totalCount={result.totalCount}
            basePath="/carts"
            searchParams={params}
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit price</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
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
                  <TableCell>
                    {uid ? (
                      <Link href={`/users/${uid}`} className="font-medium hover:text-primary">
                        {userName(cart.user)}
                      </Link>
                    ) : (
                      <span className="font-medium">{userName(cart.user)}</span>
                    )}
                    <div className="text-[12.5px] whitespace-nowrap text-muted-foreground tabular-nums">
                      Added {formatDate(cart.createdAt)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {pid ? (
                      <Link href={`/products/${pid}`} className="hover:text-primary">
                        {productName(cart.product)}
                      </Link>
                    ) : (
                      productName(cart.product)
                    )}
                    <div className="text-[12.5px] text-muted-foreground">{vendorName(cart.vendor)}</div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{qty}</TableCell>
                  <TableCell className="text-right text-foreground-secondary tabular-nums">
                    {price ? `₦ ${price.toLocaleString()}` : '—'}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {price && qty ? `₦ ${(price * qty).toLocaleString()}` : '—'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-foreground-secondary tabular-nums">
                    {formatDate(cart.updatedAt)}
                  </TableCell>
                </TableRow>
              );
            })}
            {result.data.length === 0 && (
              <EmptyRow colSpan={6} title="No cart items" body="Nobody has anything sitting in their cart right now." />
            )}
          </TableBody>
        </Table>
      </ListCard>
    </PageStack>
  );
}
