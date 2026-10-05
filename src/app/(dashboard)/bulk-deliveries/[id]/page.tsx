import Link from 'next/link';
import { notFound } from 'next/navigation';
import { authedFetch, ApiError, PaginatedResponse, SingleResponse } from '@/lib/api-client';
import { getSession } from '@/lib/session';
import { hasPermission, PermissionAction, PermissionModule } from '@/lib/permissions';
import type { AdminBulkDelivery, AdminRider } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, statusBadgeVariant } from '@/lib/format';
import { BulkDrops } from './_components/bulk-drops';

const RIDER_LIMIT = 200;

const naira = (amount: number) => `₦${Math.round(amount).toLocaleString('en-NG')}`;

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

  const tiles = [
    {
      label: 'Delivered',
      value: `${summary.delivered}/${summary.drops - summary.cancelled}`,
      hint: summary.cancelled ? `${summary.cancelled} cancelled` : `${summary.inProgress} in progress`,
    },
    { label: 'Total fees', value: naira(summary.totalFees), hint: `${summary.drops} drops` },
    {
      label: 'Vendor owes',
      value: naira(summary.vendor.outstanding),
      hint: summary.vendor.drops
        ? `${naira(summary.vendor.dueNow)} due now · ${naira(summary.vendor.paid)} paid`
        : 'No postpaid drops',
      warn: summary.vendor.dueNow > 0,
    },
    {
      label: 'Receivers paid',
      value: naira(summary.receiver.collected),
      hint: summary.receiver.drops
        ? `${naira(summary.receiver.outstanding)} still to collect`
        : 'No receiver-pays drops',
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/bulk-deliveries"
        className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-border-strong bg-card px-3 py-1.5 text-[13px] font-semibold text-foreground-secondary hover:bg-muted"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5 M12 19l-7-7 7-7"/></svg>
        Back to bulk deliveries
      </Link>

      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="rounded bg-chip px-2 py-0.5 font-mono text-lg font-semibold">{bulk.bulkId}</h1>
          <Badge variant={bulk.pricingMode === 'flat' ? 'default' : 'outline'}>
            {bulk.pricingMode === 'flat' ? 'Flat rate' : 'Standard pricing'}
          </Badge>
        </div>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          {[
            customer ? personName(customer) : null,
            formatDate(bulk.createdAt),
            personName(bulk.createdBy) ? `by ${personName(bulk.createdBy)}` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="flex flex-col gap-1 rounded-[12px] border border-border bg-card p-[13px_16px] shadow-[var(--shadow-card)]"
          >
            <span className="text-[12px] font-medium text-muted-foreground">{tile.label}</span>
            <span className={`text-[20px] font-bold tabular-nums ${tile.warn ? 'text-warning' : 'text-foreground'}`}>
              {tile.value}
            </span>
            <span className="text-[11.5px] text-muted-foreground">{tile.hint}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-[13px]">
            {customer ? (
              <>
                <Link href={`/users/${customer._id}`} className="font-semibold text-primary hover:underline">
                  {personName(customer)}
                </Link>
                <span className="text-muted-foreground">
                  {[customer.phone, customer.email].filter(Boolean).join(' · ')}
                </span>
              </>
            ) : (
              '—'
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pickup</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-[13px]">
            <span className="font-semibold">{bulk.pickupAddress?.address || '—'}</span>
            <span className="text-muted-foreground">
              {[bulk.sender?.name, bulk.sender?.phone].filter(Boolean).join(' · ')}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Terms</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-[13px] text-muted-foreground">
            {terms && bulk.pricingMode === 'flat' ? (
              <span>
                {naira(terms.flatRate)} per drop, {naira(terms.farRate)} from {terms.farDistanceKm} km
              </span>
            ) : (
              <span>Normal app pricing (under {terms?.minDropsForFlat ?? 10} drops)</span>
            )}
            <span className="capitalize">{bulk.vehicleType || 'bike'} · batch dispatch</span>
            {bulk.runSize && (
              <span>
                {bulk.runSize.minDrops}–{bulk.runSize.maxDrops} drops per rider
              </span>
            )}
            {bulk.note && <span>Note: {bulk.note}</span>}
          </CardContent>
        </Card>
      </div>

      {bulk.runs && bulk.runs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Rider runs ({bulk.runs.length})</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {bulk.runs.map((run) => (
              <Link
                key={run.batchId}
                href={`/batches/${run.batchId}`}
                className="flex flex-col gap-1 rounded-[10px] border border-border p-3 text-[13px] hover:bg-muted"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11.5px] text-primary">
                    {run.batchId.split('-').slice(0, 3).join('-')}
                  </span>
                  <Badge variant={statusBadgeVariant(run.status)} dot>
                    {run.status}
                  </Badge>
                </div>
                <span className="font-semibold">
                  {run.stops} {run.stops === 1 ? 'drop' : 'drops'}
                  {run.otherStops > 0 && (
                    <span className="font-normal text-muted-foreground">
                      {' '}· {run.bulkStops} from this bulk, {run.otherStops} from other customers
                    </span>
                  )}
                </span>
                <span className="text-[12px] text-muted-foreground">
                  {personName(run.rider ?? undefined) ?? 'Waiting for a rider'}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="py-0">
        <BulkDrops
          bulkId={bulk._id}
          drops={bulk.deliveries ?? []}
          riders={riders}
          vehicleType={bulk.vehicleType || 'bike'}
          canUpdate={canUpdate}
        />
      </Card>
    </div>
  );
}
