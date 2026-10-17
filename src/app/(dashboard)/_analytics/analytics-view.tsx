import Link from 'next/link';
import { authedFetch, ApiError, SingleResponse } from '@/lib/api-client';
import type { AnalyticsBreakdownRow, AnalyticsSummary } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { cn } from '@/lib/utils';
import { RangePicker } from './range-picker';
import { ExportSummaryButton } from './export-summary-button';
import { TrendChart, TrendLegend } from './trend-chart';
import {
  DEFAULT_PRESET,
  type DateRange,
  isDayKey,
  isPresetKey,
  lagosToday,
  resolvePreset,
} from './ranges';

const BUCKET_NOUN: Record<AnalyticsSummary['range']['bucketUnit'], string> = {
  hour: 'hour',
  day: 'day',
  week: 'week',
  month: 'month',
};

const BREAKDOWN_LABELS: Record<string, Record<string, string>> = {
  channel: { mobile: 'Mobile app', web: 'Web', api: 'API partners', admin: 'Admin (bulk)' },
  deliveryOption: { instant: 'Instant', batch: 'Batch', unknown: 'Not set' },
  paymentMethod: {
    paystack: 'Paystack',
    wallet: 'Wallet',
    'bank-transfer': 'Bank transfer',
    'pay-on-delivery': 'Pay on delivery',
    'dedicated-virtual-account': 'Virtual account',
    'buy-power-mfb': 'BuyPower MFB',
    manual: 'Manual',
    unknown: 'Not set',
  },
  vehicleType: {},
};

const naira = (value: number) => `₦${Math.round(value).toLocaleString()}`;
const count = (value: number) => value.toLocaleString();

function duration(minutes: number | null) {
  if (minutes === null) return '—';
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`;
}

function titleCase(value: string) {
  return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * The dashboard's analytics: KPIs against the previous period, trends, the
 * revenue mix and leaderboards for any date range (`?range=`, or custom
 * `?range=custom&from=&to=`).
 */
export async function AnalyticsView({ params }: { params: Record<string, string | undefined> }) {
  const preset = isPresetKey(params.range) ? params.range : DEFAULT_PRESET;
  const today = lagosToday();
  const requested: DateRange =
    resolvePreset(preset, today) ?? {
      from: isDayKey(params.from) ? params.from : today,
      to: isDayKey(params.to) ? params.to : today,
    };

  let summary: AnalyticsSummary;
  try {
    const result = await authedFetch<SingleResponse<AnalyticsSummary>>(
      `/admins/analytics/summary?${new URLSearchParams({ ...requested })}`
    );
    summary = result.data;
  } catch (error) {
    return (
      <div className="flex flex-col gap-4">
        <RangePicker preset={preset} range={requested} />
        <ApiErrorCard
          message={error instanceof ApiError ? error.message : 'Failed to load analytics.'}
        />
      </div>
    );
  }

  const { range, kpis, series, breakdowns } = summary;
  const cur = kpis.current;
  const prev = kpis.previous;
  const bucket = BUCKET_NOUN[range.bucketUnit];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {/* Keyed so the picker's local state resets after every navigation. */}
        <RangePicker
          key={`${preset}:${range.from}:${range.to}`}
          preset={preset}
          range={{ from: range.from, to: range.to }}
        />
        <span className="text-[13.5px] font-semibold text-foreground">{range.label}</span>
        <div className="ml-auto">
          <ExportSummaryButton summary={summary} />
        </div>
      </div>

      <p className="-mt-1 text-[12.5px] text-muted-foreground">
        Compared with {range.previous.label}
        {range.isPartial ? ', up to the same point in time' : ''}. Lagos time. Revenue counts
        money received, dated by when it was paid.
      </p>

      {/* Headline KPIs */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <KpiCard
          label="Revenue"
          value={naira(cur.revenue)}
          current={cur.revenue}
          previous={prev.revenue}
          hint={`${naira(cur.orderRevenue)} orders · ${naira(cur.deliveryRevenue)} deliveries`}
        />
        <KpiCard
          label="Net revenue"
          value={naira(cur.netRevenue)}
          current={cur.netRevenue}
          previous={prev.netRevenue}
          hint={
            cur.refunds > 0
              ? `After ${naira(cur.refunds)} refunded (${cur.refundCount})`
              : 'No refunds'
          }
        />
        <KpiCard
          label="Paid jobs"
          value={count(cur.jobs)}
          current={cur.jobs}
          previous={prev.jobs}
          hint={`${count(cur.paidOrders)} orders · ${count(cur.paidDeliveries)} deliveries`}
        />
        <KpiCard
          label="Avg order value"
          value={naira(cur.avgOrderValue)}
          current={cur.avgOrderValue}
          previous={prev.avgOrderValue}
          hint={`Avg delivery fee ${naira(cur.avgDeliveryFee)}`}
        />
        <KpiCard
          label="Completed"
          value={count(cur.completedJobs)}
          current={cur.completedJobs}
          previous={prev.completedJobs}
          hint={`${count(cur.completedOrders)} orders · ${count(cur.completedDeliveries)} deliveries`}
        />
        <KpiCard
          label="Cancelled"
          value={count(cur.cancelledJobs)}
          current={cur.cancelledJobs}
          previous={prev.cancelledJobs}
          lowerIsBetter
        />
        <KpiCard
          label="Avg fulfilment"
          value={duration(cur.avgFulfilmentMinutes)}
          current={cur.avgFulfilmentMinutes}
          previous={prev.avgFulfilmentMinutes}
          hint="Payment to handover"
          lowerIsBetter
        />
        <KpiCard
          label="Paying customers"
          value={count(cur.activeCustomers)}
          current={cur.activeCustomers}
          previous={prev.activeCustomers}
          hint={`${count(cur.newPayingCustomers)} paying for the first time`}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={`Revenue by ${bucket}`} aside={<TrendLegend metric="revenue" />}>
          <TrendChart data={series} metric="revenue" />
        </Panel>
        <Panel title={`Paid jobs by ${bucket}`} aside={<TrendLegend metric="jobs" />}>
          <TrendChart data={series} metric="jobs" />
        </Panel>
      </div>

      {/* Mix + growth */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Panel title="Where the money came from">
          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <Breakdown title="Channel" kind="channel" rows={breakdowns.channel} />
            <Breakdown title="Delivery speed" kind="deliveryOption" rows={breakdowns.deliveryOption} />
            <Breakdown title="Payment method" kind="paymentMethod" rows={breakdowns.paymentMethod} />
            <Breakdown title="Vehicle" kind="vehicleType" rows={breakdowns.vehicleType} />
          </div>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="Order revenue makeup">
            <StatList
              rows={[
                ['Products', naira(cur.productsCost)],
                ['Delivery fees on orders', naira(cur.orderDeliveryFees)],
                ['Service charges', naira(cur.serviceCharges)],
                ['Orders using a promo code', count(cur.promoOrders)],
              ]}
            />
          </Panel>
          <Panel title="New signups">
            <StatList
              rows={[
                ['Customers', count(cur.signups.customers), cur.signups.customers, prev.signups.customers],
                ['Vendors', count(cur.signups.vendors), cur.signups.vendors, prev.signups.vendors],
                ['Riders', count(cur.signups.riders), cur.signups.riders, prev.signups.riders],
              ]}
            />
          </Panel>
        </div>
      </div>

      {/* Leaderboards */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Top vendors">
          <Leaderboard
            empty="No vendor sales in this range."
            columns={['Vendor', 'Orders', 'Sales']}
            rows={summary.topVendors.map((v) => ({
              key: v.vendorId,
              href: `/vendors/${v.vendorId}`,
              name: v.name || '—',
              secondary: count(v.orderCount),
              primary: naira(v.totalSales),
            }))}
          />
        </Panel>
        <Panel title="Top riders">
          <Leaderboard
            empty="No completed runs in this range."
            columns={['Rider', '', 'Delivered']}
            rows={summary.topRiders.map((r) => ({
              key: r.riderId,
              href: `/riders/${r.riderId}`,
              name: r.name || '—',
              secondary: '',
              primary: count(r.deliveriesCompleted),
            }))}
          />
        </Panel>
        <Panel title="Top customers">
          <Leaderboard
            empty="No paying customers in this range."
            columns={['Customer', 'Jobs', 'Spend']}
            rows={summary.topCustomers.map((c) => ({
              key: c.userId,
              href: `/users/${c.userId}`,
              name: c.name || c.email || '—',
              secondary: count(c.jobs),
              primary: naira(c.spend),
            }))}
          />
        </Panel>
      </div>
    </div>
  );
}

export function Panel({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[15px] font-semibold text-foreground">{title}</span>
        {aside}
      </div>
      {children}
    </div>
  );
}

function Delta({
  current,
  previous,
  lowerIsBetter = false,
}: {
  current: number | null;
  previous: number | null;
  lowerIsBetter?: boolean;
}) {
  if (current === null || previous === null) return null;
  if (previous === 0) {
    return current === 0 ? (
      <span className="text-[11.5px] text-muted-foreground">No change</span>
    ) : (
      <span className="text-[11.5px] text-muted-foreground">None before</span>
    );
  }

  const change = (current - previous) / previous;
  if (Math.abs(change) < 0.005) {
    return <span className="text-[11.5px] text-muted-foreground">No change</span>;
  }
  const up = change > 0;
  const good = up !== lowerIsBetter;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[11.5px] font-semibold tabular-nums',
        good ? 'text-positive' : 'text-destructive'
      )}
    >
      {up ? '▲' : '▼'} {Math.abs(change * 100).toFixed(Math.abs(change) < 0.1 ? 1 : 0)}%
    </span>
  );
}

function KpiCard({
  label,
  value,
  current,
  previous,
  hint,
  lowerIsBetter,
}: {
  label: string;
  value: string;
  current: number | null;
  previous: number | null;
  hint?: string;
  lowerIsBetter?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-[14px] border border-border bg-card p-[15px_17px_14px] shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-medium text-muted-foreground">{label}</span>
        <Delta current={current} previous={previous} lowerIsBetter={lowerIsBetter} />
      </div>
      <div className="text-[24px] font-bold tracking-tight text-primary tabular-nums">{value}</div>
      {hint && <span className="text-[11.5px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

function Breakdown({
  title,
  kind,
  rows,
}: {
  title: string;
  kind: keyof typeof BREAKDOWN_LABELS;
  rows: AnalyticsBreakdownRow[];
}) {
  const total = rows.reduce((sum, row) => sum + row.revenue, 0);

  return (
    <div>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[.04em] text-muted-foreground">
        {title}
      </div>
      {rows.length === 0 ? (
        <p className="py-2 text-[12.5px] text-muted-foreground">Nothing paid yet.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {rows.map((row) => {
            const share = total ? row.revenue / total : 0;
            return (
              <div key={row.key}>
                <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
                  <span className="truncate font-medium text-foreground">
                    {BREAKDOWN_LABELS[kind][row.key] ?? titleCase(row.key)}
                  </span>
                  <span className="shrink-0 tabular-nums text-foreground-secondary">
                    {count(row.count)} · <span className="text-foreground">{naira(row.revenue)}</span>
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-chip">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${share * 100}%`, background: 'var(--chart-1)' }}
                    />
                  </div>
                  <span className="w-9 text-right text-[11px] tabular-nums text-muted-foreground">
                    {Math.round(share * 100)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatList({
  rows,
}: {
  rows: [label: string, value: string, current?: number, previous?: number][];
}) {
  return (
    <div className="flex flex-col">
      {rows.map(([label, value, current, previous]) => (
        <div
          key={label}
          className="flex items-center justify-between gap-3 border-t border-border py-2 first:border-0 first:pt-0"
        >
          <span className="text-[13px] text-foreground-secondary">{label}</span>
          <span className="flex items-center gap-2">
            {current !== undefined && previous !== undefined && (
              <Delta current={current} previous={previous} />
            )}
            <span className="text-[13px] font-semibold tabular-nums text-foreground">{value}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function Leaderboard({
  columns,
  rows,
  empty,
}: {
  columns: [string, string, string];
  rows: { key: string; href: string; name: string; secondary: string; primary: string }[];
  empty: string;
}) {
  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-[1fr_52px_96px] border-b border-border pb-2 text-[11px] font-semibold uppercase tracking-[.04em] text-muted-foreground">
        <span>{columns[0]}</span>
        <span className="text-right">{columns[1]}</span>
        <span className="text-right">{columns[2]}</span>
      </div>
      {rows.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        rows.map((row, i) => (
          <Link
            key={row.key}
            href={row.href}
            className="grid grid-cols-[1fr_52px_96px] items-center border-t border-border py-2.5 transition-colors first:border-0 hover:bg-muted/50"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="w-4 shrink-0 text-[11.5px] tabular-nums text-muted-foreground">
                {i + 1}
              </span>
              <span className="truncate text-[13px] font-semibold text-foreground">{row.name}</span>
            </span>
            <span className="text-right text-[13px] tabular-nums text-foreground-secondary">
              {row.secondary}
            </span>
            <span className="text-right text-[13px] font-semibold tabular-nums text-foreground">
              {row.primary}
            </span>
          </Link>
        ))
      )}
    </div>
  );
}
