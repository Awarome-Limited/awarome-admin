'use client';

import { downloadCsv, toCsv } from '@/lib/csv';
import type { AnalyticsKpis, AnalyticsSummary } from '@/lib/types';

const KPI_ROWS: { label: string; value: (k: AnalyticsKpis) => number | null }[] = [
  { label: 'Revenue (₦)', value: (k) => k.revenue },
  { label: 'Order revenue (₦)', value: (k) => k.orderRevenue },
  { label: 'Delivery revenue (₦)', value: (k) => k.deliveryRevenue },
  { label: 'Refunds (₦)', value: (k) => k.refunds },
  { label: 'Net revenue (₦)', value: (k) => k.netRevenue },
  { label: 'Products cost (₦)', value: (k) => k.productsCost },
  { label: 'Order delivery fees (₦)', value: (k) => k.orderDeliveryFees },
  { label: 'Service charges (₦)', value: (k) => k.serviceCharges },
  { label: 'Paid orders', value: (k) => k.paidOrders },
  { label: 'Paid deliveries', value: (k) => k.paidDeliveries },
  { label: 'Average order value (₦)', value: (k) => k.avgOrderValue },
  { label: 'Average delivery fee (₦)', value: (k) => k.avgDeliveryFee },
  { label: 'Orders with promo code', value: (k) => k.promoOrders },
  { label: 'Completed jobs', value: (k) => k.completedJobs },
  { label: 'Cancelled jobs', value: (k) => k.cancelledJobs },
  { label: 'Average fulfilment (minutes)', value: (k) => k.avgFulfilmentMinutes },
  { label: 'Active customers', value: (k) => k.activeCustomers },
  { label: 'New paying customers', value: (k) => k.newPayingCustomers },
  { label: 'Customer signups', value: (k) => k.signups.customers },
  { label: 'Vendor signups', value: (k) => k.signups.vendors },
  { label: 'Rider signups', value: (k) => k.signups.riders },
];

const BUCKET_HEADINGS: Record<AnalyticsSummary['range']['bucketUnit'], string> = {
  hour: 'Hour',
  day: 'Day',
  week: 'Week starting',
  month: 'Month starting',
};

export function ExportSummaryButton({ summary }: { summary: AnalyticsSummary }) {
  function handleExport() {
    const { range, kpis, series } = summary;
    const str = (value: number | null) => (value === null ? '' : String(value));

    const summaryTable = toCsv(
      KPI_ROWS.map((row) => ({
        Metric: row.label,
        [range.label]: str(row.value(kpis.current)),
        [`Previous (${range.previous.label})`]: str(row.value(kpis.previous)),
      }))
    );
    const seriesTable = toCsv(
      series.map((point) => ({
        [BUCKET_HEADINGS[range.bucketUnit]]: point.key,
        'Order revenue (₦)': String(point.orderRevenue),
        'Delivery revenue (₦)': String(point.deliveryRevenue),
        'Total revenue (₦)': String(point.revenue),
        Orders: String(point.orders),
        Deliveries: String(point.deliveries),
        'Previous range revenue (₦)': String(point.previousRevenue),
        'Previous range jobs': String(point.previousJobs),
      }))
    );

    downloadCsv(
      `${summaryTable}\r\n\r\n${seriesTable}`,
      `awarome-summary-${range.from}-to-${range.to}.csv`
    );
  }

  return (
    <button
      onClick={handleExport}
      className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-[13.5px] font-medium text-foreground transition-colors hover:bg-muted"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Export
    </button>
  );
}
