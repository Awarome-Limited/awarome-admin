import Link from 'next/link';
import { notFound } from 'next/navigation';
import { authedFetch, ApiError, SingleResponse } from '@/lib/api-client';
import { AdminProduct } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';
import { ProductEditForm } from './_components/product-edit-form';

interface Category {
  _id: string;
  name: string;
}

function initials(name?: string) {
  return (name || '')
    .replace(/[()]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function vendorName(product: AdminProduct) {
  if (!product.vendor) return '—';
  if (typeof product.vendor === 'string') return product.vendor;
  return product.vendor.businessName || product.vendor.name || '—';
}

function vendorId(product: AdminProduct): string | null {
  if (!product.vendor) return null;
  if (typeof product.vendor === 'string') return product.vendor;
  return product.vendor._id;
}

function categoryName(product: AdminProduct) {
  if (!product.category) return '—';
  if (typeof product.category === 'string') return product.category;
  return product.category.name || '—';
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let product: AdminProduct;
  let categories: Category[] = [];

  try {
    const [productRes, catsRes] = await Promise.allSettled([
      authedFetch<SingleResponse<AdminProduct>>(`/products/admin/${id}`),
      authedFetch<{ data: Category[] }>('/products/categories?limit=100'),
    ]);

    if (productRes.status === 'rejected') {
      const err = productRes.reason;
      if (err instanceof ApiError && err.statusCode === 404) notFound();
      throw err;
    }
    product = productRes.value.data;
    if (catsRes.status === 'fulfilled') {
      categories = (catsRes.value as any).data ?? [];
    }
  } catch (error) {
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Something went wrong.'}
      />
    );
  }

  const vName = vendorName(product);
  const vId = vendorId(product);
  const cName = categoryName(product);

  const infoFields = [
    { label: 'Vendor', value: vId ? <Link href={`/vendors/${vId}`} className="text-primary hover:underline">{vName}</Link> : vName },
    { label: 'Category', value: cName },
    { label: 'Delivery method', value: product.deliveryMethod || '—' },
    { label: 'Added', value: formatDate(product.createdAt) },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Back link */}
      <Link
        href="/products"
        className="inline-flex w-fit items-center gap-1.5 rounded-[9px] border border-border-strong bg-card px-3 py-1.5 text-[13px] font-semibold text-foreground-secondary hover:bg-muted"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to products
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image}
              alt={product.name}
              className="size-[54px] flex-none rounded-[14px] object-cover"
            />
          ) : (
            <div className="flex size-[54px] flex-none items-center justify-center rounded-[14px] bg-brand-tint text-[18px] font-bold text-primary">
              {initials(product.name)}
            </div>
          )}
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-foreground">
              {product.name || '—'}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge variant={product.isAvailable ? 'positive' : 'destructive'} dot>
                {product.isAvailable ? 'In stock' : 'Unavailable'}
              </Badge>
              {cName !== '—' && (
                <span className="text-[13px] text-muted-foreground">{cName}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        {[
          { label: 'Price', value: `₦${(product.price ?? 0).toLocaleString()}` },
          { label: 'Stock', value: String(product.quantityAvailable ?? 0) },
          { label: 'Status', value: product.isAvailable ? 'Available' : 'Unavailable' },
        ].map((s) => (
          <div
            key={s.label}
            className="flex flex-col gap-1.5 rounded-[14px] border border-border bg-card p-[16px_18px] shadow-[var(--shadow-card)]"
          >
            <span className="text-[12.5px] font-medium text-muted-foreground">{s.label}</span>
            <span className="text-[23px] font-bold tabular-nums tracking-tight text-primary">
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* Product information */}
      <div className="rounded-[14px] border border-border bg-card p-[20px_22px] shadow-[var(--shadow-card)]">
        <div className="mb-4 text-[15px] font-semibold text-foreground">Product information</div>
        <div className="grid gap-x-[26px] gap-y-[18px] [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
          {infoFields.map((f) => (
            <div key={f.label} className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-muted-foreground">{f.label}</span>
              <span className="text-[14px] font-medium text-foreground">{f.value}</span>
            </div>
          ))}
        </div>
        {product.description && (
          <div className="mt-[18px] flex flex-col gap-1 border-t border-border pt-[18px]">
            <span className="text-[12px] font-medium text-muted-foreground">Description</span>
            <p className="text-[14px] leading-relaxed text-foreground">{product.description}</p>
          </div>
        )}
      </div>

      <ProductEditForm product={product} categories={categories} />

    </div>
  );
}
