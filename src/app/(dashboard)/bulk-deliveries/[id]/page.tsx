import Link from 'next/link';
import { notFound } from 'next/navigation';
import { authedFetch, ApiError, PaginatedResponse, SingleResponse } from '@/lib/api-client';
import { getSession } from '@/lib/session';
import { hasPermission, PermissionAction, PermissionModule } from '@/lib/permissions';
import type { AdminBulkDelivery, AdminRider, BulkDispatchMode } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatPhone, humanize, statusBadgeVariant } from '@/lib/format';
import {
  DetailHeader,
  InlineNotice,
  PageStack,
  Panel,
  StatCards,
  SummaryRows,
  type StatCardData,
} from '@/components/page';
import { BulkDrops } from './_components/bulk-drops';
import { EditSenderDialog } from './_components/edit-dialogs';

const RIDER_LIMIT = 200;

// What the API applies to bulks booked without stored terms.
const DEFAULT_TERMS = { minDropsForFlat: 10, flatRate: 2500, farRate: 3000, farDistanceKm: 25 };

const DISPATCH_LABELS: Record<BulkDispatchMode, string> = {
  runs: 'Split across riders',
  'single-trip': 'One trip, offered to riders',
  rider: 'One trip, assigned to a rider',
  pool: 'Normal batching',
};

const naira = (amount: number) => `₦ ${Math.round(amount).toLocaleString('en-NG')}`;

function personName(person?: { firstName?: string; lastName?: string; email?: string } | string) {
  if (!person || typeof person === 'string') return null;
  return [person.firstName, person.lastName].filter(Boolean).join(' ') || person.email || null;
}

export default async function BulkDeliveryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const canUpdate =
    !!session &&
    hasPermission(session.profile, PermissionModule.DELIVERIES, PermissionAction.UPDATE);

  let bulk: AdminBulkDelivery;
  let riders: AdminRider[] = [];
  try {
    const [result, fleet] = await Promise.all([
      authedFetch<SingleResponse<AdminBulkDelivery>>(`/bulk-deliveries/${id}`),
      canUpdate
        ? authedFetch<PaginatedResponse<AdminRider>>(`/riders/admin?suspended=false&limit=${RIDER_LIMIT}`).catch(
            () => null
          )
        : Promise.resolve(null),
    ]);
    bulk = result.data;
    riders = fleet?.data ?? [];
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Something went wrong.'}
      />
    );
  }

  const { summary } = bulk;
  const customer = bulk.user && typeof bulk.user !== 'string' ? bulk.user : null;
  const terms = bulk.pricingTerms;

  const live = summary.drops - summary.cancelled;
  const stats: StatCardData[] = [
    {
      label: 'Delivered',
      value: `${summary.delivered} of ${live}`,
      progress: live > 0 ? summary.delivered / live : 0,
      meta: summary.cancelled ? `${summary.cancelled} cancelled` : `${summary.inProgress} in progress`,
    },
    { label: 'Total fees', value: naira(summary.totalFees), meta: `${summary.drops} drops` },
    {
      label: 'Vendor owes',
      value: naira(summary.vendor.outstanding),
      meta: summary.vendor.drops
        ? `${naira(summary.vendor.dueNow)} due now · ${naira(summary.vendor.paid)} paid`
        : 'No postpaid drops',
    },
    {
      label: 'Receivers paid',
      value: naira(summary.receiver.collected),
      meta: summary.receiver.drops
        ? `${naira(summary.receiver.outstanding)} still to collect`
        : 'No receiver-pays drops',
    },
  ];

  return (
    <PageStack>
      <DetailHeader
        back={{ href: '/bulk-deliveries', label: 'All bulk deliveries' }}
        title={<span className="tabular-nums">{bulk.bulkId}</span>}
        status={
          <Badge variant={bulk.pricingMode === 'flat' ? 'info' : 'secondary'}>
            {bulk.pricingMode === 'flat' ? 'Flat rate' : 'Standard pricing'}
          </Badge>
        }
        meta={[
          customer ? personName(customer) : null,
          formatDate(bulk.createdAt),
          personName(bulk.createdBy) ? `Booked by ${personName(bulk.createdBy)}` : null,
        ]}
      />

      <StatCards stats={stats} />

      {summary.vendor.dueNow > 0 && (
        <InlineNotice>
          The vendor owes {naira(summary.vendor.dueNow)} on delivered postpaid drops. Record it on Bulk receivables
          once they pay.
        </InlineNotice>
      )}

      <section className="grid items-start gap-4 lg:grid-cols-3">
        <Panel title="Customer">
          {customer ? (
            <div className="flex flex-col gap-1 text-[14px]">
              <Link href={`/users/${customer._id}`} className="font-medium text-primary hover:text-warning">
                {personName(customer)}
              </Link>
              <span className="text-[13px] text-muted-foreground tabular-nums">
                {[customer.phone && formatPhone(customer.phone), customer.email].filter(Boolean).join(' · ')}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </Panel>
        <Panel title="Pickup" aside={canUpdate && <EditSenderDialog bulkId={bulk._id} sender={bulk.sender} />}>
          <div className="flex flex-col gap-1 text-[14px]">
            <span className="font-medium">{bulk.pickupAddress?.address || '—'}</span>
            <span className="text-[13px] text-muted-foreground tabular-nums">
              {[bulk.sender?.name, bulk.sender?.phone && formatPhone(bulk.sender.phone)].filter(Boolean).join(' · ')}
            </span>
          </div>
        </Panel>
        <Panel title="Terms">
          <SummaryRows
            rows={[
              {
                label: 'Price',
                value:
                  terms && bulk.pricingMode === 'flat'
                    ? `${naira(terms.flatRate)} a drop, ${naira(terms.farRate)} from ${terms.farDistanceKm} km`
                    : `App pricing (under ${terms?.minDropsForFlat ?? 10} drops)`,
              },
              { label: 'Vehicle', value: humanize(bulk.vehicleType || 'bike') },
              {
                label: 'Dispatch',
                value: bulk.dispatchMode ? DISPATCH_LABELS[bulk.dispatchMode] : 'Batch dispatch',
              },
              ...(bulk.runSize && (!bulk.dispatchMode || bulk.dispatchMode === 'runs')
                ? [{ label: 'Run size', value: `${bulk.runSize.minDrops}–${bulk.runSize.maxDrops} drops a rider` }]
                : []),
            ]}
          />
          {bulk.note && <p className="text-[13px] text-foreground-secondary">Note: {bulk.note}</p>}
        </Panel>
      </section>

      {bulk.runs && bulk.runs.length > 0 && (
        <Panel title={`Rider runs (${bulk.runs.length})`}>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
            {bulk.runs.map((run) => (
              <Link
                key={run.batchId}
                href={`/batches/${run.batchId}`}
                className="flex flex-col gap-1.5 rounded-[8px] border border-border p-3.5 text-[13.5px] transition-colors hover:bg-muted"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium tabular-nums">{run.batchId.split('-').slice(0, 3).join('-')}</span>
                  <Badge variant={statusBadgeVariant(run.status)} dot>
                    {humanize(run.status)}
                  </Badge>
                </div>
                <span>
                  {run.stops} {run.stops === 1 ? 'drop' : 'drops'}
                  {run.otherStops > 0 && (
                    <span className="text-muted-foreground">
                      {' '}
                      · {run.bulkStops} from this bulk, {run.otherStops} from other customers
                    </span>
                  )}
                </span>
                <span className="text-[12.5px] text-muted-foreground">
                  {personName(run.rider ?? undefined) ?? 'Waiting for a rider'}
                </span>
              </Link>
            ))}
          </div>
        </Panel>
      )}

      <section className="overflow-hidden rounded-[10px] border border-border bg-card">
        <BulkDrops
          bulkId={bulk._id}
          drops={bulk.deliveries ?? []}
          riders={riders}
          vehicleType={bulk.vehicleType || 'bike'}
          canUpdate={canUpdate}
          pricing={{
            pickupAddress: bulk.pickupAddress,
            vehicleType: bulk.vehicleType || 'bike',
            pricingMode: bulk.pricingMode,
            terms: { ...DEFAULT_TERMS, ...bulk.pricingTerms },
          }}
        />
      </section>
    </PageStack>
  );
}
