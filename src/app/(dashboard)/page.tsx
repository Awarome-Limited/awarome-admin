import { Suspense } from 'react';
import Link from 'next/link';
import { getSession } from '@/lib/session';
import { authedFetch, SingleResponse } from '@/lib/api-client';
import { AnalyticsOverview } from '@/lib/types';
import { hasPermission, PermissionAction, PermissionModule } from '@/lib/permissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { statusBadgeVariant } from '@/lib/format';
import { AnalyticsView, Panel } from './_analytics/analytics-view';

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
          How orders and deliveries are doing, for any date range.
        </p>
      </div>

      {canViewAnalytics ? (
        <>
          <AnalyticsView params={params} />
          {/* Live, not tied to the range; loads on its own so it never holds up the numbers. */}
          <Suspense fallback={<div className="h-40 animate-pulse rounded-[14px] bg-muted" />}>
            <RecentActivity />
          </Suspense>
        </>
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

async function RecentActivity() {
  let recent: AnalyticsOverview['recentActivity'];
  try {
    const result = await authedFetch<SingleResponse<AnalyticsOverview>>(
      '/admins/analytics/overview?days=7'
    );
    recent = result.data.recentActivity ?? [];
  } catch {
    // The analytics above are the point of the page; this feed failing alone
    // shouldn't put an error card under them.
    return null;
  }

  return (
    <Panel
      title="Latest paid orders & deliveries"
      aside={
        <span className="flex items-center gap-3 text-[12.5px] font-semibold">
          <Link href="/orders" className="text-primary hover:underline">
            All orders →
          </Link>
          <Link href="/deliveries" className="text-primary hover:underline">
            All deliveries →
          </Link>
        </span>
      }
    >
      {recent.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No paid orders or deliveries yet.</p>
      ) : (
        <div className="grid gap-x-6 lg:grid-cols-2">
          {recent.map((row) => (
            <Link
              key={`${row.kind}-${row.id}`}
              href={row.kind === 'order' ? `/orders/${row.id}` : `/deliveries/${row.id}`}
              className="flex items-center gap-2.5 border-t border-border py-2.5 transition-colors hover:bg-muted/50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-mono text-[12.5px] font-medium text-foreground">
                    {row.reference}
                  </span>
                  <span className="shrink-0 rounded-[5px] bg-chip px-1.5 py-px text-[10px] font-semibold uppercase tracking-[.03em] text-foreground-secondary">
                    {row.kind === 'order' ? 'Order' : 'Delivery'}
                  </span>
                </div>
                <div className="truncate text-[11.5px] text-muted-foreground">
                  {row.customerName?.trim() || row.customerEmail || '—'}
                </div>
              </div>
              <span className="shrink-0 text-[13px] font-semibold tabular-nums text-foreground">
                ₦{(row.amount ?? 0).toLocaleString()}
              </span>
              <Badge
                variant={statusBadgeVariant(row.deliveryStatus || row.status)}
                dot
                className="shrink-0 text-[11.5px]"
              >
                {row.deliveryStatus || row.status}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </Panel>
  );
}
