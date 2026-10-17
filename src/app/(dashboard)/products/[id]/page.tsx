import Link from 'next/link';
import { notFound } from 'next/navigation';
import { authedFetch, ApiError, SingleResponse } from '@/lib/api-client';
import { AdminProduct } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { Badge } from '@/components/ui/badge';
import { formatDate, humanize } from '@/lib/format';
import { AvatarInitials } from '@/components/avatar-initials';
import { DetailHeader, FactList, PageStack, Panel, StatCards } from '@/components/page';
import { ProductEditForm } from './_components/product-edit-form';

interface Category {
  _id: string;
  name: string;
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

  return (
    <PageStack>
      <DetailHeader
        back={{ href: '/products', label: 'All products' }}
        avatar={
          product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image} alt="" className="size-[72px] flex-none rounded-[14px] border border-border object-cover" />
          ) : (
            <AvatarInitials name={product.name || undefined} size="lg" shape="store" />
          )
        }
        title={product.name || 'Untitled product'}
        status={
          <Badge variant={product.isAvailable ? 'positive' : 'destructive'} dot>
            {product.isAvailable ? 'In stock' : 'Unavailable'}
          </Badge>
        }
        meta={[cName !== '—' && cName, vName !== '—' && vName]}
      />

      <StatCards
        stats={[
          { label: 'Price', value: `₦ ${(product.price ?? 0).toLocaleString()}` },
          { label: 'Stock', value: (product.quantityAvailable ?? 0).toLocaleString() },
          { label: 'Delivery method', value: humanize(product.deliveryMethod) },
        ]}
      />

      <section className="grid items-start gap-4 lg:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)]">
        <Panel title="Details">
          <FactList
            facts={[
              {
                label: 'Store',
                value: vId ? (
                  <Link href={`/vendors/${vId}`} className="text-primary hover:text-warning">
                    {vName}
                  </Link>
                ) : (
                  vName
                ),
              },
              { label: 'Category', value: cName },
              { label: 'Added', value: formatDate(product.createdAt) },
              ...(product.description ? [{ label: 'Description', value: product.description }] : []),
            ]}
          />
        </Panel>
        <ProductEditForm product={product} categories={categories} />
      </section>
    </PageStack>
  );
}
