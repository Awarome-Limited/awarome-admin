import Link from 'next/link';
import { notFound } from 'next/navigation';
import { authedFetch, ApiError, SingleResponse, PaginatedResponse } from '@/lib/api-client';
import { AdminVendor, VendorStatistics, AdminProduct } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { Badge } from '@/components/ui/badge';
import { VendorEditForm } from './_components/vendor-edit-form';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { formatDate } from '@/lib/format';
import { setVendorSuspended } from '../actions';
import { SuspendToggle } from '@/components/suspend-toggle';
import { PaginationControls } from '@/components/pagination-controls';
import { DetailRow } from '@/components/detail-row';
import { getSession } from '@/lib/session';
import { hasPermission, PermissionAction, PermissionModule } from '@/lib/permissions';
import type { VendorCommission, VendorEarning, VendorPayoutSummary } from '@/lib/types';
import { VendorCommissions } from './_components/vendor-commissions';
import { payVendorNow } from '../../vendor-payouts/actions';
import { PayoutActionButton } from '../../payouts/_components/payout-action-button';
import {
  naira,
  payoutStatusLabel,
  payoutStatusVariant,
  percent,
} from '../../payouts/payout-format';

const EARNINGS_LIMIT = 10;

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

  // Money for this vendor sits behind the payments permission; staff who can
  // see vendors without it just don't get these sections.
  const session = await getSession();
  const canViewPayments =
    !!session && hasPermission(session.profile, PermissionModule.PAYMENTS, PermissionAction.VIEW);
  const canPay =
    !!session && hasPermission(session.profile, PermissionModule.PAYMENTS, PermissionAction.UPDATE);
  const earningsSkip = Number(sp.eSkip ?? 0);
  let payoutSummary: VendorPayoutSummary | null = null;
  let commissions: VendorCommission[] = [];
  let earnings: PaginatedResponse<VendorEarning> | null = null;
  if (canViewPayments) {
    const [summaryRes, commissionsRes, earningsRes] = await Promise.allSettled([
      authedFetch<SingleResponse<VendorPayoutSummary>>(`/admins/vendor-payouts/vendors/${id}/summary`),
      authedFetch<SingleResponse<VendorCommission[]>>(`/admins/vendors/${id}/commissions`),
      authedFetch<PaginatedResponse<VendorEarning>>(
        `/admins/vendor-payouts/vendors/${id}/earnings?skip=${earningsSkip}&limit=${EARNINGS_LIMIT}`
      ),
    ]);
    if (summaryRes.status === 'fulfilled') payoutSummary = summaryRes.value.data;
    if (commissionsRes.status === 'fulfilled') commissions = commissionsRes.value.data;
    if (earningsRes.status === 'fulfilled') earnings = earningsRes.value;
  }

  const displayName = vendor.businessName || vendor.name || '—';
  const location = vendor.city || vendor.address || '';
  const owner = vendor.users?.[0];
  const ownerName = owner
    ? [owner.firstName, owner.lastName].filter(Boolean).join(' ') || owner.email || '—'
    : '—';
  const categoryList = vendor.type?.map((t) => t.replace(/_/g, ' ')).join(', ') || '—';

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

      {canViewPayments && (
        <VendorCommissions vendorId={vendor._id} agreements={commissions} canEdit={canPay} />
      )}

      {payoutSummary && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.4fr] lg:items-start">
          <div className="rounded-[14px] border border-border bg-card p-[18px_20px] shadow-[var(--shadow-card)]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[15px] font-semibold text-foreground">Payouts</span>
              {canPay &&
                !payoutSummary.inFlight &&
                payoutSummary.balance >= 100 &&
                payoutSummary.bankAccount?.verified && (
                  <PayoutActionButton
                    label={`Pay ${naira(payoutSummary.balance)} now`}
                    title="Pay this vendor now?"
                    description={`${naira(payoutSummary.balance)} — their whole balance — is sent by Paystack transfer to ${payoutSummary.bankAccount.bankName} •••• ${payoutSummary.bankAccount.accountNumber?.slice(-4)} (${payoutSummary.bankAccount.accountName}).`}
                    confirmLabel="Send payout"
                    successMessage="Payout sent to Paystack"
                    action={payVendorNow.bind(null, vendor._id)}
                  />
                )}
            </div>
            <div className="flex flex-col gap-3 text-sm">
              <DetailRow label="Balance owed" value={<span className="font-semibold">{naira(payoutSummary.balance)}</span>} />
              <DetailRow
                label="Payout account"
                value={
                  payoutSummary.bankAccount?.accountNumber ? (
                    <span className="flex flex-wrap items-center justify-end gap-2">
                      {payoutSummary.bankAccount.bankName} · {payoutSummary.bankAccount.accountNumber}
                      {payoutSummary.bankAccount.verified ? (
                        <Badge variant="positive">Verified</Badge>
                      ) : (
                        <Badge variant="warning">Not verified</Badge>
                      )}
                    </span>
                  ) : (
                    'None added — the vendor adds it in their app'
                  )
                }
              />
              {payoutSummary.bankAccount?.accountName && (
                <DetailRow label="Account name" value={payoutSummary.bankAccount.accountName} />
              )}
              {payoutSummary.inFlight && (
                <DetailRow
                  label="In flight"
                  value={
                    <Link href={`/vendor-payouts/${payoutSummary.inFlight._id}`} className="flex items-center gap-2 hover:underline">
                      {naira(payoutSummary.inFlight.amount)}
                      <Badge variant={payoutStatusVariant(payoutSummary.inFlight.status)}>
                        {payoutStatusLabel(payoutSummary.inFlight.status)}
                      </Badge>
                    </Link>
                  }
                />
              )}
              <DetailRow
                label="Products sold (picked up)"
                value={`${naira(payoutSummary.earnings.gross)} · ${payoutSummary.earnings.orders} ${payoutSummary.earnings.orders === 1 ? 'order' : 'orders'}`}
              />
              <DetailRow label="Commission kept" value={naira(payoutSummary.earnings.commission)} />
              <DetailRow
                label="Paid to date"
                value={`${naira(payoutSummary.totalPaid)} · ${payoutSummary.payoutsCount} ${payoutSummary.payoutsCount === 1 ? 'payout' : 'payouts'}`}
              />
              <DetailRow label="Last paid" value={payoutSummary.lastPaidAt ? formatDate(payoutSummary.lastPaidAt) : '—'} />
              <Link href={`/vendor-payouts?vendor=${vendor._id}`} className="text-[13px] font-semibold text-primary hover:underline">
                Payout history →
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
            <div className="px-5 pb-3 pt-[18px]">
              <div className="text-[15px] font-semibold text-foreground">Earnings by order</div>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                Credited when the rider picks the order up: this vendor&apos;s products only, less the
                commission in force when the customer paid.
              </p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead className="text-right">Products</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">Owed</TableHead>
                    <TableHead>Paid out</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(earnings?.data ?? []).map((e) => (
                    <TableRow key={e._id}>
                      <TableCell>
                        {e.order ? (
                          <Link href={`/orders/${e.order}`} className="rounded bg-chip px-2 py-0.5 font-mono text-xs hover:underline">
                            {e.orderId ?? e.order}
                          </Link>
                        ) : (
                          e.orderId ?? '—'
                        )}
                        <span className="block text-[11.5px] text-muted-foreground">{formatDate(e.pickedUpAt)}</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{naira(e.grossAmount)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {e.commissionAmount ? `−${naira(e.commissionAmount)} (${percent(e.commissionPercent)})` : '—'}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{naira(e.amount)}</TableCell>
                      <TableCell>
                        {e.payout ? (
                          <Link href={`/vendor-payouts/${e.payout}`} className="text-[12.5px] font-semibold text-primary hover:underline">
                            View payout
                          </Link>
                        ) : (
                          <span className="text-[12.5px] text-muted-foreground">Not yet</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(earnings?.data.length ?? 0) === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        No earnings yet. Orders are credited once a rider picks them up.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {earnings && earnings.totalCount > EARNINGS_LIMIT && (
              <div className="border-t border-border px-4 py-3">
                <PaginationControls
                  skip={earningsSkip}
                  limit={EARNINGS_LIMIT}
                  totalCount={earnings.totalCount}
                  basePath={`/vendors/${id}`}
                  searchParams={sp}
                  skipParam="eSkip"
                />
              </div>
            )}
          </div>
        </div>
      )}

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

      <VendorEditForm vendor={vendor} />
    </div>
  );
}


