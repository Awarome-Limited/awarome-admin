import Link from 'next/link';
import { authedFetch, ApiError, PaginatedResponse, SingleResponse } from '@/lib/api-client';
import { ApiErrorCard } from '@/components/api-error-card';
import { SearchBox } from '@/components/search-box';
import { PaginationControls } from '@/components/pagination-controls';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { formatDate, humanize, formatNaira } from '@/lib/format';
import { SegmentedLinks } from '@/components/segmented';
import {
  EmptyRow,
  InlineNotice,
  ListCard,
  PageHeader,
  PageStack,
  RowChevron,
  RowLink,
  ToolbarEnd,
} from '@/components/page';
import { getSession } from '@/lib/session';
import { hasPermission, PermissionAction, PermissionModule } from '@/lib/permissions';
import type { AdminBusinessPayoutRecord, AdminBusinessPayoutRun, BusinessPayoutSettings } from '@/lib/types';
import { PayoutActionButton } from '../payouts/_components/payout-action-button';
import { PayoutSettingsCard } from '../payouts/_components/payout-settings';
import {
  businessPayoutStatusLabel,
  businessPayoutStatusVariant,
  formatLagosHour,
  maskedAccount,
  naira,
  payoutTriggerLabel,
  personName,
} from '../payouts/payout-format';
import { startBusinessPayoutRun, updateBusinessPayoutSettings } from './actions';
import { StatStrip } from '@/components/stat-strip';

const LIMIT = 20;

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'success', label: 'Paid', statuses: 'success' },
  { key: 'pending', label: 'In flight', statuses: 'pending' },
  { key: 'failed', label: 'Failed', statuses: 'failed' },
  { key: 'reversed', label: 'Reversed', statuses: 'reversed' },
] as const;

type PayoutsResponse = PaginatedResponse<AdminBusinessPayoutRecord> & {
  counts: Record<string, number>;
  amountsKobo: Record<string, number>;
};

const transfers = (n: number) => `${n} ${n === 1 ? 'transfer' : 'transfers'}`;

function filterCount(counts: Record<string, number>, key: string) {
  const filter = FILTERS.find((f) => f.key === key);
  if (!filter || !('statuses' in filter)) return counts.all ?? 0;
  return counts[filter.statuses] ?? 0;
}

const RUN_STATUS_VARIANT = { running: 'info', completed: 'positive', failed: 'destructive' } as const;

export default async function BusinessPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const skip = Number(params.skip ?? 0);
  const search = params.search ?? '';
  const activeFilter = params.filter ?? 'all';
  const filter = FILTERS.find((f) => f.key === activeFilter);

  const query = new URLSearchParams();
  query.set('skip', String(skip));
  query.set('limit', String(LIMIT));
  if (search) query.set('search', search);
  if (params.business) query.set('business', params.business);
  if (params.run) query.set('run', params.run);
  if (filter && 'statuses' in filter) query.set('status', filter.statuses);

  const session = await getSession();
  const canPay = !!session && hasPermission(session.profile, PermissionModule.PAYMENTS, PermissionAction.UPDATE);
  const canEditSettings = !!session && hasPermission(session.profile, PermissionModule.PRICING, PermissionAction.UPDATE);

  let result: PayoutsResponse;
  let runs: AdminBusinessPayoutRun[] = [];
  let settings: BusinessPayoutSettings | null = null;
  try {
    const [payoutsRes, runsRes, configRes] = await Promise.all([
      authedFetch<PayoutsResponse>(`/admins/business-payouts?${query.toString()}`),
      authedFetch<PaginatedResponse<AdminBusinessPayoutRun>>('/admins/business-payouts/runs?limit=6'),
      authedFetch<SingleResponse<BusinessPayoutSettings>>('/admins/dispatch-config').catch(() => null),
    ]);
    result = payoutsRes;
    runs = runsRes.data;
    settings = configRes?.data ?? null;
  } catch (error) {
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Something went wrong.'}
      />
    );
  }

  const counts = result.counts ?? {};
  const amounts = result.amountsKobo ?? {};
  const running = runs.some((run) => run.status === 'running');

  const chips = [
    { label: 'Paid out', value: formatNaira(amounts.success ?? 0), sub: transfers(counts.success ?? 0) },
    { label: 'In flight', value: formatNaira(amounts.pending ?? 0), sub: transfers(counts.pending ?? 0) },
    { label: 'Failed', value: formatNaira(amounts.failed ?? 0), sub: transfers(counts.failed ?? 0) },
    { label: 'Reversed', value: formatNaira(amounts.reversed ?? 0), sub: transfers(counts.reversed ?? 0) },
  ];

  const hrefWith = (changes: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { search, filter: activeFilter, business: params.business, run: params.run, ...changes };
    Object.entries(merged).forEach(([k, v]) => {
      if (v && !(k === 'filter' && v === 'all')) p.set(k, v);
    });
    const s = p.toString();
    return `/business-payouts${s ? `?${s}` : ''}`;
  };

  return (
    <PageStack>
      <PageHeader
        title="Business payouts"
        subtitle={
          <>
            Every Paystack transfer to an Awarome Business account: what its pay-on-delivery runs collected, less the
            delivery fee and Paystack’s collection fee. Businesses are paid the day after delivery.
            {settings &&
              (settings.businessPayoutsEnabled
                ? ` Daily run at ${formatLagosHour(settings.businessPayoutHourLagos)}.`
                : ' Automatic payouts are off.')}
          </>
        }
        actions={
          canPay && (
            <PayoutActionButton
              label={running ? 'Run in progress…' : 'Run business payouts now'}
              title="Pay every business now?"
              description={`Every business owed at least ${naira(settings?.businessPayoutMinAmount ?? 0)} for deliveries made before today, with a verified account, is sent that amount by Paystack transfer.`}
              confirmLabel="Send payouts"
              successMessage="Business payout run started — it will appear under Recent runs."
              action={startBusinessPayoutRun}
            />
          )
        }
      />

      <StatStrip stats={chips.map((chip) => ({ label: chip.label, value: chip.value, meta: chip.sub }))} />

      {(counts.failed ?? 0) > 0 && activeFilter !== 'failed' && (
        <InlineNotice action={<Link href={hrefWith({ filter: 'failed', skip: undefined })}>Show failed</Link>}>
          {transfers(counts.failed ?? 0)} failed. Those deliveries are back in the businesses’ wallets until a payout
          succeeds.
        </InlineNotice>
      )}

      {(params.business || params.run) && (
        <InlineNotice
          tone="info"
          action={<Link href={hrefWith({ business: undefined, run: undefined, skip: undefined })}>Show all</Link>}
        >
          {params.business ? 'Showing one business’s payouts.' : 'Showing one run’s payouts.'}
        </InlineNotice>
      )}

      <ListCard
        toolbar={
          <>
            <SegmentedLinks
              active={activeFilter}
              items={FILTERS.map((f) => ({
                key: f.key,
                label: f.label,
                href: hrefWith({ filter: f.key, skip: undefined }),
                count: filterCount(counts, f.key),
              }))}
            />
            <ToolbarEnd>
              <SearchBox placeholder="Business, account or reference" />
            </ToolbarEnd>
          </>
        }
        footer={
          <PaginationControls
            skip={skip}
            limit={LIMIT}
            totalCount={result.totalCount}
            basePath="/business-payouts"
            searchParams={params}
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Paid to</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Deliveries</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.data.map((payout) => (
              <TableRow key={payout._id} className="relative">
                <TableCell>
                  <RowLink href={`/business-payouts/${payout._id}`}>{payout.business?.name ?? 'Deleted business'}</RowLink>
                  <div className="text-[12.5px] whitespace-nowrap text-muted-foreground tabular-nums">
                    {formatDate(payout.createdAt)} · {payout.reference}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={businessPayoutStatusVariant(payout.status)} dot>
                    {businessPayoutStatusLabel(payout.status)}
                  </Badge>
                  {payout.failureReason && (
                    <div className="mt-1 max-w-[220px] truncate text-[12.5px] text-destructive" title={payout.failureReason}>
                      {payout.failureReason}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="whitespace-nowrap tabular-nums">{maskedAccount(payout.bankSnapshot)}</div>
                  <div className="text-[12.5px] text-muted-foreground">{payout.bankSnapshot?.accountName || '—'}</div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-foreground-secondary">
                  {payoutTriggerLabel(payout.trigger ?? 'scheduled')}
                </TableCell>
                <TableCell className="text-right text-foreground-secondary tabular-nums">{payout.deliveryCount}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{formatNaira(payout.amountKobo)}</TableCell>
                <TableCell>
                  <RowChevron />
                </TableCell>
              </TableRow>
            ))}
            {result.data.length === 0 && (
              <EmptyRow colSpan={7} title="No business payouts match" body="Clear the search or switch tabs." />
            )}
          </TableBody>
        </Table>
      </ListCard>

      <ListCard title="Recent runs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Run</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Started by</TableHead>
              <TableHead className="text-right">Transfers</TableHead>
              <TableHead className="text-right">Failed</TableHead>
              <TableHead className="text-right">Skipped</TableHead>
              <TableHead className="text-right">Sent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.length === 0 && <EmptyRow colSpan={7} title="No business payout runs yet" />}
            {runs.map((run) => (
              <TableRow key={run._id} className="relative">
                <TableCell>
                  <RowLink href={`/business-payouts/runs/${run._id}`}>
                    {run.trigger === 'scheduled' ? `Daily · ${run.runKey.replace(/^business-/, '')}` : 'Manual run'}
                  </RowLink>
                  <div className="text-[12.5px] whitespace-nowrap text-muted-foreground tabular-nums">
                    {formatDate(run.startedAt)}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={RUN_STATUS_VARIANT[run.status] ?? 'secondary'} dot>
                    {humanize(run.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-foreground-secondary">
                  {run.initiatedBy ? personName(run.initiatedBy) : 'Scheduler'}
                </TableCell>
                <TableCell className="text-right tabular-nums">{run.stats?.initiated ?? 0}</TableCell>
                <TableCell className="text-right tabular-nums">{run.stats?.failed ?? 0}</TableCell>
                <TableCell className="text-right tabular-nums">{run.stats?.skipped ?? 0}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{naira(run.stats?.totalAmount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ListCard>

      {settings && (
        <PayoutSettingsCard
          settings={{
            enabled: settings.businessPayoutsEnabled,
            hourLagos: settings.businessPayoutHourLagos,
            minAmount: settings.businessPayoutMinAmount,
          }}
          canEdit={canEditSettings}
          description="Once a day, every business is sent what its deliveries collected before today, if it comes to at least the minimum. Transfer OTP must be off in the Paystack dashboard, and the Paystack balance funded, or transfers will wait or fail."
          save={updateBusinessPayoutSettings}
        />
      )}
    </PageStack>
  );
}
