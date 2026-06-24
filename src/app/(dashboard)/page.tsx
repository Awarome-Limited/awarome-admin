import Link from 'next/link';
import { getSession } from '@/lib/session';
import { authedFetch, ApiError, SingleResponse, PaginatedResponse } from '@/lib/api-client';
import { AnalyticsOverview, AdminOrder } from '@/lib/types';
import { hasPermission, PermissionAction, PermissionModule } from '@/lib/permissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiErrorCard } from '@/components/api-error-card';
import { AvatarInitials } from '@/components/avatar-initials';
import { Badge } from '@/components/ui/badge';
import { RevenueChart } from '@/components/charts/revenue-chart';
import { OrdersByStatusChart } from '@/components/charts/orders-by-status-chart';
import { formatDate, statusBadgeVariant } from '@/lib/format';
import { cn } from '@/lib/utils';

const RANGES = [
  { key: '7d', label: '7d', days: 7 },
  { key: '30d', label: '30d', days: 30 },
  { key: 'mtd', label: 'MTD', days: 30 },
  { key: 'year', label: 'Year', days: 365 },
  { key: 'all', label: 'All', days: 3650 },
];

export default async function DashboardHomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getSession();
  const params = await searchParams;

  const canViewAnalytics =
    !!session && hasPermission(session.profile, PermissionModule.ANALYTICS, PermissionAction.VIEW);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-[24px] font-bold tracking-tight text-foreground">
          Welcome back{session ? `, ${session.profile.firstName}` : ''}
        </h1>
        <p className="mt-1.5 text-[14px] text-muted-foreground">
          Here&rsquo;s what&rsquo;s happening across the marketplace today.
        </p>
      </div>

      {canViewAnalytics ? (
        <AnalyticsSection rangeKey={params.range} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Your role: {session?.profile.role}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Ask a super admin for analytics access to see business-wide metrics here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

async function AnalyticsSection({ rangeKey }: { rangeKey?: string }) {
  const range = RANGES.find((r) => r.key === rangeKey) ?? RANGES[1];

  const [overviewResult, ordersResult] = await Promise.allSettled([
    authedFetch<SingleResponse<AnalyticsOverview>>(
      `/admins/analytics/overview?days=${range.days}`
    ),
    authedFetch<PaginatedResponse<AdminOrder>>('/admins/orders?limit=4&skip=0'),
  ]);

  if (overviewResult.status === 'rejected') {
    const error = overviewResult.reason;
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Failed to load analytics.'}
      />
    );
  }

  const overview = overviewResult.value.data;
  const recentOrders =
    ordersResult.status === 'fulfilled' ? ordersResult.value.data : [];

  const { summary, revenueOverTime, ordersByStatus, topVendors } = overview;

  const statCards = [
    {
      label: 'Total revenue',
      value: `₦${summary.totalRevenue.toLocaleString()}`,
      icon: 'M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
    },
    {
      label: 'Confirmed orders',
      value: summary.totalOrders.toLocaleString(),
      icon: 'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0',
    },
    {
      label: 'Active vendors',
      value: summary.activeVendors.toLocaleString(),
      icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
    },
    {
      label: 'Total deliveries',
      value: summary.totalDeliveries.toLocaleString(),
      icon: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12',
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Range picker */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-[14px] text-muted-foreground">
          Showing {range.label.toLowerCase()} · updated just now
        </p>
        <div className="inline-flex gap-0.5 rounded-[10px] border border-border-strong bg-secondary p-[3px]">
          {RANGES.map((r) => (
            <Link
              key={r.key}
              href={`/?range=${r.key}`}
              className={cn(
                'rounded-[8px] px-[11px] py-1.5 text-[12.5px] font-semibold transition-colors',
                r.key === range.key
                  ? 'bg-card text-foreground shadow-[var(--shadow-card)]'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="flex flex-col gap-2.5 rounded-[14px] border border-border bg-card p-[17px_18px_15px] shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] font-medium text-muted-foreground">{card.label}</span>
              <span className="flex size-[30px] items-center justify-center rounded-[8px] bg-brand-tint text-primary">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d={card.icon} />
                </svg>
              </span>
            </div>
            <div className="text-[26px] font-bold tracking-tight text-primary tabular-nums">
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        {/* Revenue chart */}
        <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[15px] font-semibold text-foreground">Revenue</span>
            <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <span className="size-[9px] rounded-[3px] bg-primary" />
              Confirmed
            </span>
          </div>
          <RevenueChart data={revenueOverTime} />
        </div>

        {/* Orders by status */}
        <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <span className="text-[15px] font-semibold text-foreground">Orders by status</span>
          <div className="mt-1.5">
            <OrdersByStatusChart data={ordersByStatus} />
          </div>
        </div>
      </div>

      {/* Bottom row: Top vendors + Top orders */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        {/* Top vendors */}
        <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="mb-3.5 text-[15px] font-semibold text-foreground">Top vendors</div>
          <div className="flex flex-col">
            <div className="grid grid-cols-[1fr_70px_110px] border-b border-border pb-2 text-[11px] font-semibold uppercase tracking-[.04em] text-muted-foreground">
              <span>Vendor</span>
              <span className="text-right">Orders</span>
              <span className="text-right">Sales</span>
            </div>
            {topVendors.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No vendor sales yet.</p>
            ) : (
              topVendors.map((vendor) => (
                <Link
                  key={vendor.vendorId}
                  href={`/vendors/${vendor.vendorId}`}
                  className="grid grid-cols-[1fr_70px_110px] items-center border-t border-border py-2.5 transition-colors hover:bg-muted/50"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex size-[30px] shrink-0 items-center justify-center rounded-[8px] bg-brand-tint text-[11px] font-bold text-primary">
                      {initials(vendor.name || '?')}
                    </div>
                    <span className="min-w-0 truncate text-[13px] font-semibold text-foreground">
                      {vendor.name || '—'}
                    </span>
                  </div>
                  <span className="text-right text-[13px] tabular-nums text-foreground-secondary">
                    {vendor.orderCount}
                  </span>
                  <span className="text-right text-[13px] font-semibold tabular-nums text-foreground">
                    ₦{vendor.totalSales.toLocaleString()}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Top orders */}
        <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="mb-3.5 text-[15px] font-semibold text-foreground">Recent orders</div>
          <div className="flex flex-col">
            {recentOrders.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              recentOrders.map((order) => {
                const custName = orderCustomerName(order.user);
                return (
                  <Link
                    key={order._id}
                    href={`/orders/${order._id}`}
                    className="flex items-center gap-2.5 border-t border-border py-2.5 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-mono text-[12.5px] font-medium text-foreground">
                        {order.orderId || order._id}
                      </div>
                      <div className="text-[11.5px] text-muted-foreground">{custName}</div>
                    </div>
                    <span className="shrink-0 text-[13px] font-semibold tabular-nums text-foreground">
                      ₦{(order.totalPrice ?? 0).toLocaleString()}
                    </span>
                    <Badge variant={statusBadgeVariant(order.status)} dot className="shrink-0 text-[11.5px]">
                      {order.status}
                    </Badge>
                  </Link>
                );
              })
            )}
          </div>
          {recentOrders.length > 0 && (
            <Link
              href="/orders"
              className="mt-3 block text-center text-[12.5px] font-semibold text-primary hover:underline"
            >
              View all orders →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0].toUpperCase())
    .slice(0, 2)
    .join('');
}

function orderCustomerName(user: AdminOrder['user']) {
  if (!user || typeof user === 'string') return user || '—';
  return (
    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
    user.email ||
    '—'
  );
}
