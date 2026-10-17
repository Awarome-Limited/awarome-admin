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
import { formatDate, formatPhone, humanize } from '@/lib/format';
import { setVendorSuspended } from '../actions';
import { AccountStatusControl, StatusPill } from '@/components/account-status';
import { AvatarInitials } from '@/components/avatar-initials';
import {
  DetailHeader,
  EmptyRow,
  FactList,
  InlineNotice,
  PageStack,
  Panel,
  RowLink,
  StatCards,
  type StatCardData,
} from '@/components/page';
import { PaginationControls } from '@/components/pagination-controls';
import { getSession } from '@/lib/session';
import { hasPermission, PermissionAction, PermissionModule } from '@/lib/permissions';
import type { VendorCommission, VendorEarning, VendorPayoutSummary } from '@/lib/types';
import { VendorCommissions } from './_components/vendor-commissions';
import { payVendorNow, recordVendorBankPayout } from '../../vendor-payouts/actions';
import { RecordBankPayoutDialog } from '../../payouts/_components/record-bank-payout-dialog';
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

function formatSales(naira?: number) {
  if (!naira) return '₦0';
  if (naira >= 1_000_000) return `₦ ${(naira / 1_000_000).toFixed(2)}M`;
  if (naira >= 1_000) return `₦ ${(naira / 1_000).toFixed(1)}k`;
  return `₦ ${naira.toLocaleString()}`;
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

  const displayName = vendor.businessName || vendor.name;
  const location = vendor.city || vendor.address || '';
  const owner = vendor.users?.[0];
  const ownerName = owner
    ? [owner.firstName, owner.lastName].filter(Boolean).join(' ') || owner.email || '—'
    : '—';
  const approval =
    vendor.status === 'approved'
      ? { label: 'Approved', variant: 'positive' as const }
      : vendor.status === 'rejected'
        ? { label: 'Rejected', variant: 'destructive' as const }
        : { label: 'Waiting for review', variant: 'info' as const };

  const statCards: StatCardData[] = [
    { label: 'Products', value: (stats?.totalProductsCount ?? 0).toLocaleString() },
    {
      label: 'Orders',
      value: (stats?.totalOrdersCount ?? 0).toLocaleString(),
      meta: (
        <Link href={`/orders?vendor=${id}`} className="font-medium text-primary hover:text-warning">
          View orders
        </Link>
      ),
    },
    { label: 'Total sales', value: stats ? formatSales(stats.totalSales) : '—' },
    payoutSummary
      ? {
          label: 'Balance to pay out',
          value: naira(payoutSummary.balance),
          meta: payoutSummary.lastPaidAt
            ? `Last payout ${formatDate(payoutSummary.lastPaidAt).split(',')[0]}`
            : 'No payouts yet',
        }
      : { label: 'Rating', value: vendor.rating ? `${vendor.rating.toFixed(1)} / 5` : '—' },
  ];

  return (
    <PageStack>
      <DetailHeader
        back={{ href: '/vendors', label: 'All vendors' }}
        avatar={<AvatarInitials name={displayName || undefined} size="lg" shape="store" />}
        title={displayName || 'No name yet'}
        status={<StatusPill suspended={!!vendor.suspended} />}
        meta={[
          <Badge key="approval" variant={approval.variant} dot>
            {approval.label}
          </Badge>,
          location,
          vendor.createdAt && `Joined ${formatDate(vendor.createdAt).split(',')[0]}`,
        ]}
        actions={
          <AccountStatusControl
            noun="vendor"
            suspended={!!vendor.suspended}
            action={setVendorSuspended.bind(null, vendor._id)}
          />
        }
      />

      <StatCards stats={statCards} />

      {payoutSummary && !payoutSummary.bankAccount?.accountNumber && payoutSummary.balance > 0 && (
        <InlineNotice>
          {displayName || 'This vendor'} is owed {naira(payoutSummary.balance)} but has no payout account. They
          add it in the vendor app.
        </InlineNotice>
      )}

      <section className="grid items-start gap-4 lg:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-4">
          <Panel title="Profile">
            <FactList
              facts={[
                { label: 'Owner', value: ownerName },
                { label: 'Email', value: vendor.email || 'No email' },
                { label: 'Phone', value: formatPhone(vendor.phone) },
                { label: 'Address', value: vendor.address || vendor.city || '—' },
                { label: 'Opening hours', value: formatHours(vendor) },
                {
                  label: 'Categories',
                  value: vendor.type?.length ? (
                    <span className="flex flex-wrap gap-1">
                      {vendor.type.map((t) => (
                        <Badge key={t} variant="secondary">
                          {humanize(t)}
                        </Badge>
                      ))}
                    </span>
                  ) : (
                    '—'
                  ),
                },
                { label: 'Rating', value: vendor.rating ? `${vendor.rating.toFixed(1)} / 5` : 'No ratings yet' },
                { label: 'Joined', value: formatDate(vendor.createdAt) },
              ]}
            />
          </Panel>

          {payoutSummary && (
            <Panel
              title="Payouts"
              aside={
                canPay &&
                !payoutSummary.inFlight && (
                  <div className="flex flex-wrap items-center gap-2">
                    {payoutSummary.balance > 0 && (
                      <RecordBankPayoutDialog
                        payee="this vendor"
                        owed={payoutSummary.balance}
                        action={recordVendorBankPayout.bind(null, vendor._id)}
                      />
                    )}
                    {payoutSummary.balance >= 100 && payoutSummary.bankAccount?.verified && (
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
                )
              }
            >
              <FactList
                facts={[
                  {
                    label: 'Payout account',
                    value: payoutSummary.bankAccount?.accountNumber ? (
                      <span className="flex flex-wrap items-center gap-2">
                        {payoutSummary.bankAccount.bankName} · {payoutSummary.bankAccount.accountNumber}
                        {payoutSummary.bankAccount.verified ? (
                          <Badge variant="positive">Verified</Badge>
                        ) : (
                          <Badge variant="warning">Not verified</Badge>
                        )}
                      </span>
                    ) : (
                      <Badge variant="warning">Not set</Badge>
                    ),
                  },
                  ...(payoutSummary.bankAccount?.accountName
                    ? [{ label: 'Account name', value: payoutSummary.bankAccount.accountName }]
                    : []),
                  ...(payoutSummary.inFlight
                    ? [
                        {
                          label: 'In flight',
                          value: (
                            <Link
                              href={`/vendor-payouts/${payoutSummary.inFlight._id}`}
                              className="inline-flex items-center gap-2 hover:text-primary"
                            >
                              {naira(payoutSummary.inFlight.amount)}
                              <Badge variant={payoutStatusVariant(payoutSummary.inFlight.status)}>
                                {payoutStatusLabel(payoutSummary.inFlight.status)}
                              </Badge>
                            </Link>
                          ),
                        },
                      ]
                    : []),
                  {
                    label: 'Products sold (picked up)',
                    value: `${naira(payoutSummary.earnings.gross)} · ${payoutSummary.earnings.orders} ${payoutSummary.earnings.orders === 1 ? 'order' : 'orders'}`,
                  },
                  { label: 'Commission kept', value: naira(payoutSummary.earnings.commission) },
                  {
                    label: 'Paid to date',
                    value: `${naira(payoutSummary.totalPaid)} · ${payoutSummary.payoutsCount} ${payoutSummary.payoutsCount === 1 ? 'payout' : 'payouts'}`,
                  },
                ]}
              />
              <Link
                href={`/vendor-payouts?vendor=${vendor._id}`}
                className="text-[13.5px] font-medium text-primary hover:text-warning"
              >
                Payout history
              </Link>
            </Panel>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Panel
            flush
            title="Products"
            aside={
              <Link
                href={`/products?vendor=${id}`}
                className="text-[13.5px] font-medium text-primary hover:text-warning"
              >
                View all products
              </Link>
            }
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Availability</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const categoryName =
                      product.category && typeof product.category !== 'string'
                        ? product.category.name
                        : typeof product.category === 'string'
                          ? product.category
                          : '';
                    return (
                      <TableRow key={product._id} className="relative">
                        <TableCell>
                          <RowLink href={`/products/${product._id}`}>{product.name || 'Untitled product'}</RowLink>
                          <div className="text-[12.5px] text-muted-foreground">{categoryName || 'No category'}</div>
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          ₦ {(product.price ?? 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-foreground-secondary tabular-nums">
                          {(product.quantityAvailable ?? 0).toLocaleString()}
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
                    <EmptyRow colSpan={4} title="No products yet" body="Products this store lists show up here." />
                  )}
                </TableBody>
              </Table>
            </div>
            {productsTotalCount > PRODUCTS_LIMIT && (
              <div className="border-t border-border px-6 py-3.5">
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
          </Panel>

          {payoutSummary && (
            <Panel
              flush
              title="Earnings by order"
              description="Credited when the rider picks the order up: this vendor’s products only, less the commission in force when the customer paid."
            >
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
                        <TableCell className="tabular-nums">
                          {e.order ? (
                            <Link href={`/orders/${e.order}`} className="font-medium hover:text-primary">
                              {e.orderId ?? e.order}
                            </Link>
                          ) : (
                            e.orderId ?? '—'
                          )}
                          <div className="text-[12.5px] text-muted-foreground">{formatDate(e.pickedUpAt)}</div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{naira(e.grossAmount)}</TableCell>
                        <TableCell className="text-right text-muted-foreground tabular-nums">
                          {e.commissionAmount
                            ? `−${naira(e.commissionAmount)} (${percent(e.commissionPercent)})`
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{naira(e.amount)}</TableCell>
                        <TableCell>
                          {e.payout ? (
                            <Link
                              href={`/vendor-payouts/${e.payout}`}
                              className="text-[13px] font-medium text-primary hover:text-warning"
                            >
                              View payout
                            </Link>
                          ) : (
                            <span className="text-[13px] text-muted-foreground">Not yet</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(earnings?.data.length ?? 0) === 0 && (
                      <EmptyRow
                        colSpan={5}
                        title="No earnings yet"
                        body="Orders are credited once a rider picks them up."
                      />
                    )}
                  </TableBody>
                </Table>
              </div>
              {earnings && earnings.totalCount > EARNINGS_LIMIT && (
                <div className="border-t border-border px-6 py-3.5">
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
            </Panel>
          )}

          {canViewPayments && (
            <VendorCommissions vendorId={vendor._id} agreements={commissions} canEdit={canPay} />
          )}

          <VendorEditForm vendor={vendor} />
        </div>
      </section>
    </PageStack>
  );
}
