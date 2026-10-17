import Link from 'next/link';
import { authedFetch, ApiError, SingleResponse } from '@/lib/api-client';
import type { AnalyticsBreakdownRow, AnalyticsSummary } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { cn } from '@/lib/utils';
import { RangePicker } from './range-picker';
import { ExportSummaryButton } from './export-summary-button';
import { TrendCard } from './trend-chart';
import {
  DEFAULT_PRESET,
  type DateRange,
  isDayKey,
  isPresetKey,
  lagosToday,
  resolvePreset,
} from './ranges';

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

const SIGNUP_ROWS: { key: keyof AnalyticsSummary['kpis']['current']['signups']; label: string; href: string }[] = [
  { key: 'customers', label: 'Customers', href: '/users' },
  { key: 'riders', label: 'Riders', href: '/riders' },
  { key: 'vendors', label: 'Vendors', href: '/vendors' },
  { key: 'businesses', label: 'Businesses', href: '/businesses' },
  { key: 'partners', label: 'API partners', href: '/partners' },
];

// Older backends only send the first three kinds.
const signupTotal = (signups: Partial<Record<string, number>>) =>
  SIGNUP_ROWS.reduce((sum, row) => sum + (signups[row.key] ?? 0), 0);

const naira = (value: number) => `₦ ${Math.round(value).toLocaleString()}`;
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
 * `?range=custom&from=&to=`). Renders the page header too, since the range
 * control and the comparison sentence live there; `attention` slots in
 * between the header and the numbers.
 */
export async function AnalyticsView({
  params,
  title,
  attention,
}: {
  params: Record<string, string | undefined>;
  title: string;
  attention?: React.ReactNode;
}) {
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
      <div className="flex flex-col gap-7">
        <DashboardHeader
          title={title}
          subtitle="How orders and deliveries are doing, for any date range."
          controls={<RangePicker preset={preset} range={requested} />}
        />
        {attention}
        <ApiErrorCard
          message={error instanceof ApiError ? error.message : 'Failed to load analytics.'}
        />
      </div>
    );
  }

  const { range, kpis, series, breakdowns } = summary;
  const cur = kpis.current;
  const prev = kpis.previous;

  return (
    <div className="flex flex-col gap-7">
      <DashboardHeader
        title={title}
        subtitle={
          <>
            {range.label}, compared with {range.previous.label}
            {range.isPartial ? ' up to the same time' : ''}. Revenue is money received, dated by
            when it was paid.
          </>
        }
        controls={
          <>
            {/* Keyed so the picker's local state resets after every navigation. */}
            <RangePicker
              key={`${preset}:${range.from}:${range.to}`}
              preset={preset}
              range={{ from: range.from, to: range.to }}
            />
            <ExportSummaryButton summary={summary} />
          </>
        }
      />

      {attention}

      {/* Four headline KPIs, then four secondary ones in a strip. */}
      <div className="flex flex-col gap-3">
        <section className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
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
        </section>
        <section className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] overflow-hidden rounded-[10px] border border-border bg-card">
          <SecondaryKpi
            label="Completed"
            value={count(cur.completedJobs)}
            current={cur.completedJobs}
            previous={prev.completedJobs}
          />
          <SecondaryKpi
            label="Cancelled"
            value={count(cur.cancelledJobs)}
            current={cur.cancelledJobs}
            previous={prev.cancelledJobs}
            lowerIsBetter
          />
          <SecondaryKpi
            label="Avg fulfilment"
            value={duration(cur.avgFulfilmentMinutes)}
            current={cur.avgFulfilmentMinutes}
            previous={prev.avgFulfilmentMinutes}
            lowerIsBetter
          />
          <SecondaryKpi
            label="Paying customers"
            value={count(cur.activeCustomers)}
            current={cur.activeCustomers}
            previous={prev.activeCustomers}
            meta={`${count(cur.newPayingCustomers)} new`}
          />
        </section>
      </div>

      {/* Trend + where the money came from */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <TrendCard data={series} previousLabel={range.previous.label} />
        <Panel title="Where the money came from">
          <Breakdown kind="channel" rows={breakdowns.channel} />
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Panel title="Delivery speed">
          <Breakdown kind="deliveryOption" rows={breakdowns.deliveryOption} />
        </Panel>
        <Panel title="Payment method">
          <Breakdown kind="paymentMethod" rows={breakdowns.paymentMethod} />
        </Panel>
        <Panel title="Vehicle">
          <Breakdown kind="vehicleType" rows={breakdowns.vehicleType} />
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
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
        <Panel
          title="New signups"
          aside={
            <span className="flex items-center gap-2">
              <Delta current={signupTotal(cur.signups)} previous={signupTotal(prev.signups)} />
              <span className="text-[13.5px] font-medium tabular-nums text-foreground">
                {count(signupTotal(cur.signups))} total
              </span>
            </span>
          }
        >
          <StatList
            rows={SIGNUP_ROWS.map((row) => [
              row.label,
              count(cur.signups[row.key] ?? 0),
              cur.signups[row.key] ?? 0,
              prev.signups[row.key] ?? 0,
              row.href,
            ])}
          />
        </Panel>
      </section>

      {/* Leaderboards */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Panel title="Top vendors">
          <Leaderboard
            empty="No vendor sales in this range."
            columns={['Vendor', 'Orders', 'Sales']}
            rows={summary.topVendors.map((v) => ({
              key: v.vendorId,
              href: `/vendors/${v.vendorId}`,
              name: v.name || 'No name yet',
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
              name: r.name || 'No name yet',
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
              name: c.name || c.email || 'No name yet',
              secondary: count(c.jobs),
              primary: naira(c.spend),
            }))}
          />
        </Panel>
      </section>
    </div>
  );
}

function DashboardHeader({
  title,
  subtitle,
  controls,
}: {
  title: string;
  subtitle: React.ReactNode;
  controls: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div>
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">{controls}</div>
    </div>
  );
}

export function Panel({
  title,
  aside,
  children,
  flush = false,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  /** Children run edge to edge (tables) instead of sitting in the padding. */
  flush?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col overflow-hidden rounded-[10px] border border-border bg-card',
        !flush && 'gap-[18px] px-6 py-[22px]'
      )}
    >
      <div
        className={cn('flex flex-wrap items-center justify-between gap-2', flush && 'px-6 py-[18px]')}
      >
        <h3 className="text-[17px] leading-tight font-bold">{title}</h3>
        {aside}
      </div>
      {children}
    </div>
  );
}

type Trend = 'good' | 'bad' | 'flat';

/**
 * Honest comparisons (DESIGN.md §1.4): direction and meaning, so a rise in
 * Cancelled is red; no ±100% against an empty or missing baseline.
 */
function compare(current: number | null, previous: number | null, lowerIsBetter = false) {
  if (current === null || previous === null) return { text: '—', trend: 'flat' as Trend };
  if (previous === 0) {
    return current === 0
      ? { text: 'No change', trend: 'flat' as Trend }
      : { text: '—', trend: 'flat' as Trend, title: 'Nothing in the comparison period' };
  }
  const change = (current - previous) / previous;
  if (Math.abs(change) < 0.005) return { text: 'No change', trend: 'flat' as Trend };
  const up = change > 0;
  const pct = Math.abs(change * 100).toFixed(Math.abs(change) < 0.1 ? 1 : 0);
  return { text: `${up ? '+' : '−'}${pct}%`, trend: (up !== lowerIsBetter ? 'good' : 'bad') as Trend };
}

const TREND_PILL: Record<Trend, string> = {
  good: 'bg-positive-bg text-positive font-semibold',
  bad: 'bg-negative-bg text-destructive font-semibold',
  flat: 'bg-muted text-muted-foreground font-medium',
};

function Delta({
  current,
  previous,
  lowerIsBetter = false,
}: {
  current: number | null;
  previous: number | null;
  lowerIsBetter?: boolean;
}) {
  const { text, trend, title } = compare(current, previous, lowerIsBetter);
  return (
    <span
      title={title}
      className={cn('rounded-full px-2 py-[3px] text-[12px] whitespace-nowrap tabular-nums', TREND_PILL[trend])}
    >
      {text}
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
    <div className="flex flex-col gap-2.5 rounded-[10px] border border-border bg-card px-[22px] py-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13.5px] text-foreground-secondary">{label}</span>
        <Delta current={current} previous={previous} lowerIsBetter={lowerIsBetter} />
      </div>
      <span className="stat-value text-[32px] leading-none">{value}</span>
      {hint && <span className="text-[12.5px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

function SecondaryKpi({
  label,
  value,
  current,
  previous,
  meta,
  lowerIsBetter,
}: {
  label: string;
  value: string;
  current: number | null;
  previous: number | null;
  meta?: string;
  lowerIsBetter?: boolean;
}) {
  const { text, trend } = compare(current, previous, lowerIsBetter);
  return (
    <div className="-ml-px flex flex-col gap-1 border-l border-border px-[22px] py-4">
      <span className="text-[12.5px] text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="stat-value text-[22px] leading-[1.1] tracking-[-0.03em]">{value}</span>
        <span
          className={cn(
            'text-[12px] tabular-nums',
            trend === 'good' ? 'text-positive' : trend === 'bad' ? 'text-destructive' : 'text-muted-foreground'
          )}
        >
          {text}
        </span>
        {meta && <span className="text-[12px] text-muted-foreground">· {meta}</span>}
      </div>
    </div>
  );
}

function Breakdown({
  kind,
  rows,
}: {
  kind: keyof typeof BREAKDOWN_LABELS;
  rows: AnalyticsBreakdownRow[];
}) {
  const total = rows.reduce((sum, row) => sum + row.revenue, 0);

  return (
    <div>
      {rows.length === 0 ? (
        <p className="py-2 text-[13px] text-muted-foreground">Nothing paid yet.</p>
      ) : (
        <div className="flex flex-col gap-[18px]">
          {rows.map((row) => {
            const share = total ? row.revenue / total : 0;
            return (
              <div key={row.key}>
                <div className="flex items-baseline justify-between gap-2 text-[13.5px]">
                  <span className="truncate text-foreground-secondary">
                    {BREAKDOWN_LABELS[kind][row.key] ?? titleCase(row.key)}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {count(row.count)} ·{' '}
                    <span className="font-medium text-foreground">{naira(row.revenue)}</span>
                  </span>
                </div>
                <div className="mt-[7px] flex items-center gap-2">
                  <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-muted">
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
  rows: [label: string, value: string, current?: number, previous?: number, href?: string][];
}) {
  return (
    <div className="flex flex-col">
      {rows.map(([label, value, current, previous, href]) => (
        <div
          key={label}
          className="flex items-center justify-between gap-3 border-t border-border py-2.5 first:border-0 first:pt-0"
        >
          {href ? (
            <Link href={href} className="text-[13.5px] text-foreground-secondary hover:text-primary">
              {label}
            </Link>
          ) : (
            <span className="text-[13.5px] text-foreground-secondary">{label}</span>
          )}
          <span className="flex items-center gap-2">
            {current !== undefined && previous !== undefined && (
              <Delta current={current} previous={previous} />
            )}
            <span className="text-[13.5px] font-medium tabular-nums text-foreground">{value}</span>
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
      <div className="grid grid-cols-[1fr_52px_96px] border-b border-border pb-2.5 text-[11.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
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
            className="grid grid-cols-[1fr_52px_96px] items-center border-t border-border py-3 transition-colors first:border-0 hover:bg-muted"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="w-4 shrink-0 text-[11.5px] tabular-nums text-muted-foreground">
                {i + 1}
              </span>
              <span className="truncate text-[14px] font-medium text-foreground">{row.name}</span>
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
