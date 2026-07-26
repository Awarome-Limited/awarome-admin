import Link from 'next/link';
import { notFound } from 'next/navigation';
import { authedFetch, ApiError, SingleResponse, PaginatedResponse } from '@/lib/api-client';
import { AdminVendor, VendorStatistics, AdminProduct } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/submit-button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { formatDate } from '@/lib/format';
import { setVendorSuspended, updateVendor } from '../actions';
import { SuspendToggle } from '@/components/suspend-toggle';
import { PaginationControls } from '@/components/pagination-controls';

/**
 * Coerce a stored vendor time into the 'HH:MM' an <input type="time"> needs.
 * Vendor hours are free-text on the API, so older records hold things like
 * '8:00', '8am' or '8:30 PM'. Returns '' when it can't be read, which leaves
 * the picker empty rather than showing a wrong time.
 */
function toTimeInputValue(value?: string): string {
  const raw = value?.trim();
  if (!raw) return '';

  const match = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(raw);
  if (!match) return '';

  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  const meridiem = match[3]?.toLowerCase();

  if (meridiem === 'pm' && hours < 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return '';

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function formatHours(vendor: AdminVendor): string {
  if (!vendor.opensAt && !vendor.closesAt) return '—';
  return `${vendor.opensAt || '—'} – ${vendor.closesAt || '—'}`;
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

function formatSales(naira?: number) {
  if (!naira) return '₦0';
  if (naira >= 1_000_000) return `₦${(naira / 1_000_000).toFixed(2)}M`;
  if (naira >= 1_000) return `₦${(naira / 1_000).toFixed(1)}k`;
  return `₦${naira.toLocaleString()}`;
}

const PRODUCTS_LIMIT = 10;

export default async function VendorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const productSkip = Number(sp.pSkip ?? 0);

  let vendor: AdminVendor;
  let stats: VendorStatistics | null = null;

  try {
    const [vendorRes, statsRes] = await Promise.allSettled([
      authedFetch<SingleResponse<AdminVendor>>(`/vendors/admin/${id}`),
      authedFetch<SingleResponse<VendorStatistics>>(`/vendors/admin/${id}/statistics`),
    ]);

    if (vendorRes.status === 'rejected') {
      const err = vendorRes.reason;
      if (err instanceof ApiError && err.statusCode === 404) notFound();
      throw err;
    }
    vendor = vendorRes.value.data;
    if (statsRes.status === 'fulfilled') stats = statsRes.value.data;
  } catch (error) {
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Something went wrong.'}
      />
    );
  }

  let products: AdminProduct[] = [];
  let productsTotalCount = 0;
  try {
    const pq = new URLSearchParams();
    pq.set('limit', String(PRODUCTS_LIMIT));
    pq.set('skip', String(productSkip));
    const productsRes = await authedFetch<PaginatedResponse<AdminProduct>>(
      `/vendors/admin/${id}/products?${pq.toString()}`
    );
    products = (productsRes as any).data?.products ?? productsRes.data ?? [];
    productsTotalCount = productsRes.totalCount ?? products.length;
  } catch {
    // non-fatal
  }

  const displayName = vendor.businessName || vendor.name || '—';
  const location = vendor.city || vendor.address || '';
  const owner = vendor.users?.[0];
  const ownerName = owner
    ? [owner.firstName, owner.lastName].filter(Boolean).join(' ') || owner.email || '—'
    : '—';
  const categoryList = vendor.type?.map((t) => t.replace(/_/g, ' ')).join(', ') || '—';

  async function handleEdit(formData: FormData) {
    'use server';
    // A <input type="time"> renders blank for a legacy value it can't parse.
    // Only send the hours when something was actually picked, so submitting an
    // untouched form never wipes an existing (oddly formatted) time.
    const opensAt = formData.get('opensAt')?.toString().trim();
    const closesAt = formData.get('closesAt')?.toString().trim();
    await updateVendor(id, {
      name: formData.get('name')?.toString(),
      businessName: formData.get('businessName')?.toString(),
      email: formData.get('email')?.toString(),
      phone: formData.get('phone')?.toString(),
      address: formData.get('address')?.toString(),
      status: formData.get('status')?.toString(),
      ...(opensAt ? { opensAt } : {}),
      ...(closesAt ? { closesAt } : {}),
    });
  }

  const infoFields = [
    { label: 'Owner / contact', value: ownerName },
    { label: 'Email', value: vendor.email || '—' },
    { label: 'Phone', value: vendor.phone || '—' },
    { label: 'Address', value: vendor.address || vendor.city || '—' },
    { label: 'Opening hours', value: formatHours(vendor) },
    { label: 'Categories', value: categoryList },
    { label: 'Joined', value: formatDate(vendor.createdAt) },
  ];

  const statCards = [
    { label: 'Products', value: String(stats?.totalProductsCount ?? '—'), href: undefined },
    { label: 'Orders', value: String(stats?.totalOrdersCount ?? '—'), href: `/orders?vendor=${id}` },
    { label: 'Total sales', value: stats ? formatSales(stats.totalSales) : '—', href: undefined },
    { label: 'Rating', value: vendor.rating ? `${vendor.rating.toFixed(1)} ★` : '—', href: undefined },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Back link */}
      <Link
        href="/vendors"
        className="inline-flex w-fit items-center gap-1.5 rounded-[9px] border border-border-strong bg-card px-3 py-1.5 text-[13px] font-semibold text-foreground-secondary hover:bg-muted"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to vendors
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex size-[54px] flex-none items-center justify-center rounded-[14px] bg-brand-tint text-[18px] font-bold text-primary">
            {initials(displayName)}
          </div>
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-foreground">
              {displayName}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge variant={vendor.status === 'approved' ? 'positive' : vendor.status === 'rejected' ? 'destructive' : 'warning'} dot>
                {vendor.status === 'approved' ? 'Approved' : vendor.status === 'rejected' ? 'Rejected' : 'Pending Review'}
              </Badge>
              <Badge variant={vendor.suspended ? 'destructive' : 'positive'} dot>
                {vendor.suspended ? 'Suspended' : 'Active'}
              </Badge>
              {location && (
                <span className="text-[13px] text-muted-foreground">{location}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <SuspendToggle
            suspended={!!vendor.suspended}
            action={setVendorSuspended.bind(null, vendor._id)}
          />
          <a
            href="#edit-vendor"
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-primary px-[15px] py-[9px] text-[13px] font-semibold text-white shadow hover:brightness-105"
          >
            Edit vendor
          </a>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
        {statCards.map((s) => {
          const inner = (
            <>
              <span className="text-[12.5px] font-medium text-muted-foreground">{s.label}</span>
              <span className="text-[23px] font-bold tabular-nums tracking-tight text-primary">
                {s.value}
              </span>
              {s.href && (
                <span className="mt-1 text-[12px] font-semibold text-primary">
                  View orders →
                </span>
              )}
            </>
          );
          return s.href ? (
            <Link
              key={s.label}
              href={s.href}
              className="flex flex-col gap-1.5 rounded-[14px] border border-border bg-card p-[16px_18px] shadow-[var(--shadow-card)] transition-colors hover:border-primary/40 hover:bg-brand-tint"
            >
              {inner}
            </Link>
          ) : (
            <div
              key={s.label}
              className="flex flex-col gap-1.5 rounded-[14px] border border-border bg-card p-[16px_18px] shadow-[var(--shadow-card)]"
            >
              {inner}
            </div>
          );
        })}
      </div>

      {/* Vendor information */}
      <div className="rounded-[14px] border border-border bg-card p-[20px_22px] shadow-[var(--shadow-card)]">
        <div className="mb-4 text-[15px] font-semibold text-foreground">Vendor information</div>
        <div className="grid gap-x-[26px] gap-y-[18px] [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          {infoFields.map((f) => (
            <div key={f.label} className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-muted-foreground">{f.label}</span>
              <span className="text-[14px] font-medium text-foreground">{f.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Products table */}
      <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between px-5 pb-3 pt-[18px]">
          <span className="text-[15px] font-semibold text-foreground">
            Products{stats ? ` (${stats.totalProductsCount})` : ''}
          </span>
          <Link
            href={`/products?vendor=${id}`}
            className="text-[12.5px] font-semibold text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => {
                const categoryName =
                  product.category && typeof product.category !== 'string'
                    ? product.category.name
                    : typeof product.category === 'string'
                    ? product.category
                    : '—';
                const pInits = initials(product.name);
                return (
                  <TableRow key={product._id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 flex-none items-center justify-center rounded-[8px] bg-brand-tint text-[11px] font-bold text-primary">
                          {pInits}
                        </div>
                        <span className="text-[13.5px] font-semibold text-foreground">
                          {product.name || '—'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[13px] text-muted-foreground">
                      {categoryName || '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      ₦{(product.price ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {product.quantityAvailable ?? 0}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.isAvailable ? 'positive' : 'destructive'} dot>
                        {product.isAvailable ? 'In stock' : 'Unavailable'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No products yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {productsTotalCount > PRODUCTS_LIMIT && (
          <div className="border-t border-border px-4 py-3">
            <PaginationControls
              skip={productSkip}
              limit={PRODUCTS_LIMIT}
              totalCount={productsTotalCount}
              basePath={`/vendors/${id}`}
              searchParams={sp}
              skipParam="pSkip"
            />
          </div>
        )}
      </div>

      {/* Edit vendor */}
      <div
        id="edit-vendor"
        className="rounded-[14px] border border-border bg-card p-[20px_22px] shadow-[var(--shadow-card)]"
      >
        <div className="mb-4 text-[15px] font-semibold text-foreground">Edit vendor</div>
        <form action={handleEdit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" name="name" defaultValue={vendor.name} />
            <Field label="Business name" name="businessName" defaultValue={vendor.businessName} />
            <Field label="Email" name="email" defaultValue={vendor.email} />
            <Field label="Phone" name="phone" defaultValue={vendor.phone} />
            <Field label="Address" name="address" defaultValue={vendor.address} className="sm:col-span-2" />
            <TimeField
              label="Opens at"
              name="opensAt"
              stored={vendor.opensAt}
            />
            <TimeField
              label="Closes at"
              name="closesAt"
              stored={vendor.closesAt}
            />
            <div className="flex flex-col gap-2">
              <Label htmlFor="status">Approval Status</Label>
              <select
                id="status"
                name="status"
                defaultValue={vendor.status ?? 'pending'}
                className="flex h-[36px] w-full rounded-[9px] border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus:border-primary/50"
              >
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
          <div>
            <SubmitButton />
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className ?? ''}`}>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} />
    </div>
  );
}

function TimeField({
  label,
  name,
  stored,
}: {
  label: string;
  name: string;
  stored?: string;
}) {
  const value = toTimeInputValue(stored);
  // Legacy free-text the picker can't render — show what's on record so the
  // admin knows it isn't blank, and can replace it deliberately.
  const unreadable = !value && !!stored?.trim();

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type="time" defaultValue={value} />
      {unreadable && (
        <span className="text-[12px] text-muted-foreground">
          Currently stored as “{stored}” — pick a time to replace it.
        </span>
      )}
    </div>
  );
}
