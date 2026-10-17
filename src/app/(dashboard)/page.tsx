import { Suspense } from 'react';
import Link from 'next/link';
import { getSession } from '@/lib/session';
import { authedFetch, SingleResponse } from '@/lib/api-client';
import { AnalyticsOverview } from '@/lib/types';
import {
  hasPermission,
  PermissionAction,
  PermissionModule,
  StaffProfile,
} from '@/lib/permissions';
import { getQueueCounts } from '@/lib/queues';
import type { QueueKey } from '@/lib/nav-items';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate, statusBadgeVariant } from '@/lib/format';
import { AnalyticsView, Panel } from './_analytics/analytics-view';

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', hour: 'numeric', hour12: false }).format(
      new Date()
    )
  );
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default async function DashboardHomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getSession();
  const params = await searchParams;
  const title = `${greeting()}${session ? `, ${session.profile.firstName}` : ''}`;

  const canViewAnalytics =
    !!session && hasPermission(session.profile, PermissionModule.ANALYTICS, PermissionAction.VIEW);

  const attention = session && (
    <Suspense fallback={<div className="h-[188px] animate-pulse rounded-[10px] bg-muted" />}>
      <NeedsYouNow profile={session.profile} />
    </Suspense>
  );

  if (!canViewAnalytics) {
    return (
      <div className="flex flex-col gap-7">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">
            Ask a super admin for analytics access to see business-wide numbers here.
          </p>
        </div>
        {attention}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <AnalyticsView params={params} title={title} attention={attention} />
      {/* Live, not tied to the range; loads on its own so it never holds up the numbers. */}
      <Suspense fallback={<div className="h-40 animate-pulse rounded-[10px] bg-muted" />}>
        <LatestPaidJobs />
      </Suspense>
    </div>
  );
}

const QUEUES: { key: QueueKey; label: string; meta: string; href: string }[] = [
  {
    key: 'unassigned',
    label: 'Jobs without a rider',
    meta: 'Paid and waiting for dispatch',
    href: '/unassigned',
  },
  {
    key: 'riderApprovals',
    label: 'Riders to approve',
    meta: 'Documents waiting for review',
    href: '/riders/approvals?filter=pending',
  },
  {
    key: 'supportTickets',
    label: 'Open support tickets',
    meta: 'Cash and changed-order requests',
    href: '/support-tickets?filter=open',
  },
  {
    key: 'cancellations',
    label: 'Cancellations to decide',
    meta: 'Customers waiting on an answer',
    href: '/cancellations?filter=pending',
  },
];

/** Action before inventory: queues that block customers or riders, each a deep link. */
async function NeedsYouNow({ profile }: { profile: StaffProfile }) {
  const counts = await getQueueCounts(profile);
  const tiles = QUEUES.filter((q) => counts[q.key] !== undefined);
  if (tiles.length === 0) return null;
  const waiting = tiles.filter((q) => counts[q.key]! > 0);

  return (
    <section className="flex flex-col gap-4 rounded-[10px] border border-border bg-card px-[22px] py-5">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <AsteriskMark />
        <h2 className="text-[19px] leading-tight font-bold">Needs you now</h2>
        <span className="text-[13px] text-muted-foreground">
          {waiting.length > 0 ? 'Queues that block customers or riders' : 'Nothing is waiting on you'}
        </span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3">
        {tiles.map((q) => {
          const n = counts[q.key]!;
          return (
            <Link
              key={q.key}
              href={q.href}
              className={
                n > 0
                  ? 'flex flex-col gap-1.5 rounded-[8px] border border-border bg-hi-soft px-[18px] py-4 transition-colors hover:border-hi'
                  : 'flex flex-col gap-1.5 rounded-[8px] border border-border px-[18px] py-4 text-muted-foreground transition-colors hover:bg-muted'
              }
            >
              <span className="stat-value text-[30px] leading-none text-foreground">{n}</span>
              <span className="text-[14px] font-medium text-foreground">{q.label}</span>
              <span className="text-[12.5px] text-foreground-secondary">{q.meta}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/** The Awarome asterisk: the one decorative mark, used once on the page. */
function AsteriskMark() {
  return (
    <svg viewBox="0 0 27.26 27.26" width="18" height="18" fill="currentColor" className="text-hi" aria-hidden>
      <path d="M11.709 0h3.842c.352 0 .639.286.639.639v6.812l4.817-4.816a.64.64 0 0 1 .902 0l2.716 2.716a.64.64 0 0 1 0 .903L19.809 11.07h6.812c.352 0 .639.286.639.639v3.842a.64.64 0 0 1-.639.639h-6.812l4.816 4.817a.64.64 0 0 1 0 .902l-2.716 2.716a.64.64 0 0 1-.902 0L16.19 19.809v6.812a.64.64 0 0 1-.639.639h-3.842a.64.64 0 0 1-.639-.639v-6.812l-4.816 4.816a.64.64 0 0 1-.903 0L2.635 21.909a.64.64 0 0 1 0-.902l4.816-4.817H.639A.64.64 0 0 1 0 15.551v-3.842c0-.352.286-.639.639-.639h6.812L2.635 6.254a.64.64 0 0 1 0-.903L5.351 2.635a.64.64 0 0 1 .903 0l4.816 4.816V.639c0-.352.286-.639.639-.639Z" />
    </svg>
  );
}

async function LatestPaidJobs() {
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
      flush
      title="Latest paid jobs"
      aside={
        <span className="flex items-center gap-4 text-[13.5px] font-medium">
          <Link href="/orders" className="text-primary hover:text-warning">
            View all orders
          </Link>
          <Link href="/deliveries" className="text-primary hover:text-warning">
            View all deliveries
          </Link>
        </span>
      }
    >
      {recent.length === 0 ? (
        <div className="flex flex-col items-center gap-2 border-t border-border px-6 py-14 text-center">
          <span className="font-heading text-[18px] font-bold tracking-[-0.03em]">No paid jobs yet</span>
          <span className="text-[14px] text-foreground-secondary">
            Paid orders and deliveries show up here as soon as the money lands.
          </span>
        </div>
      ) : (
        <Table className="border-t border-border">
          <TableHeader>
            <TableRow>
              <TableHead>Job</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recent.map((row) => {
              const href = row.kind === 'order' ? `/orders/${row.id}` : `/deliveries/${row.id}`;
              const stage = row.deliveryStatus || row.status;
              return (
                <TableRow key={`${row.kind}-${row.id}`} className="relative">
                  <TableCell className="tabular-nums">
                    <Link href={href} className="font-medium after:absolute after:inset-0">
                      {row.reference}
                    </Link>
                    <div className="text-[12.5px] text-muted-foreground">{formatDate(row.createdAt)}</div>
                  </TableCell>
                  <TableCell>{row.customerName?.trim() || row.customerEmail || 'No name yet'}</TableCell>
                  <TableCell className="text-foreground-secondary">
                    {row.kind === 'order' ? 'Order' : 'Delivery'}
                  </TableCell>
                  <TableCell>
                    {stage ? (
                      <Badge variant={statusBadgeVariant(stage)} dot>
                        {stage.replace(/[-_]/g, ' ').replace(/^\w/, (c) => c.toUpperCase())}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    ₦ {(row.amount ?? 0).toLocaleString()}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}
