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
import { formatDate, humanize } from '@/lib/format';
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
import type { AdminPayoutRun, AdminRiderPayout, PayoutSettings } from '@/lib/types';
import { startPayoutRun, updatePayoutSettings } from './actions';
import { PayoutActionButton } from './_components/payout-action-button';
import { PayoutSettingsCard } from './_components/payout-settings';
import {
  formatLagosHour,
  maskedAccount,
  naira,
  payoutStatusLabel,
  payoutStatusVariant,
  payoutTriggerLabel,
  personName,
} from './payout-format';
import { StatStrip } from '@/components/stat-strip';

const LIMIT = 20;

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'success', label: 'Paid', statuses: 'success' },
  { key: 'in-flight', label: 'In flight', statuses: 'processing,awaiting-otp' },
  { key: 'failed', label: 'Failed', statuses: 'failed' },
  { key: 'reversed', label: 'Reversed', statuses: 'reversed' },
] as const;

type PayoutsResponse = PaginatedResponse<AdminRiderPayout> & {
  counts: Record<string, number>;
  amounts: Record<string, number>;
};

const sumOf = (record: Record<string, number>, statuses: string) =>
  statuses.split(',').reduce((sum, s) => sum + (record[s] ?? 0), 0);

const transfers = (n: number) => `${n} ${n === 1 ? 'transfer' : 'transfers'}`;

function filterCount(counts: Record<string, number>, key: string) {
  const filter = FILTERS.find((f) => f.key === key);
  if (!filter || !('statuses' in filter)) return counts.all ?? 0;
  return sumOf(counts, filter.statuses);
}

const RUN_STATUS_VARIANT = { running: 'info', completed: 'positive', failed: 'destructive' } as const;

export default async function PayoutsPage({
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
  if (params.rider) query.set('rider', params.rider);
  if (params.run) query.set('run', params.run);
  if (filter && 'statuses' in filter) query.set('status', filter.statuses);

  const session = await getSession();
  const canPay = !!session && hasPermission(session.profile, PermissionModule.PAYMENTS, PermissionAction.UPDATE);
  const canEditSettings = !!session && hasPermission(session.profile, PermissionModule.PRICING, PermissionAction.UPDATE);

  let result: PayoutsResponse;
  let runs: AdminPayoutRun[] = [];
  let settings: PayoutSettings | null = null;
  try {
    const [payoutsRes, runsRes, configRes] = await Promise.all([
      authedFetch<PayoutsResponse>(`/admins/payouts?${query.toString()}`),
      authedFetch<PaginatedResponse<AdminPayoutRun>>('/admins/payouts/runs?limit=6'),
      authedFetch<SingleResponse<PayoutSettings>>('/admins/dispatch-config').catch(() => null),
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
  const amounts = result.amounts ?? {};
  const running = runs.some((run) => run.status === 'running');

  const chips = [
    { label: 'Paid out', value: naira(amounts.success), sub: transfers(counts.success ?? 0) },
    {
      label: 'In flight',
      value: naira(sumOf(amounts, 'processing,awaiting-otp')),
      sub: counts['awaiting-otp']
        ? `${counts['awaiting-otp']} waiting on an OTP`
        : transfers(sumOf(counts, 'processing,awaiting-otp')),
    },
    { label: 'Failed', value: naira(amounts.failed), sub: transfers(counts.failed ?? 0) },
    { label: 'Reversed', value: naira(amounts.reversed), sub: transfers(counts.reversed ?? 0) },
  ];

  const hrefWith = (changes: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { search, filter: activeFilter, rider: params.rider, run: params.run, ...changes };
    Object.entries(merged).forEach(([k, v]) => {
      if (v && !(k === 'filter' && v === 'all')) p.set(k, v);
    });
    const s = p.toString();
    return `/payouts${s ? `?${s}` : ''}`;
  };

  return (
    <PageStack>
      <PageHeader
        title="Rider payouts"
        subtitle={
          <>
            Every Paystack transfer to a courier: what was sent, to which account, and where it stands.
            {settings &&
              (settings.payoutsEnabled
                ? ` Daily run at ${formatLagosHour(settings.payoutHourLagos)}.`
                : ' Automatic payouts are off.')}
          </>
        }
        actions={
          canPay && (
            <PayoutActionButton
              label={running ? 'Run in progress…' : 'Run payouts now'}
              title="Pay every courier now?"
              description={`Every courier owed at least ${naira(settings?.payoutMinAmount ?? 0)} with a verified account is sent their full balance by Paystack transfer. Couriers already paid today are only paid anything they have earned since.`}
              confirmLabel="Send payouts"
              successMessage="Payout run started — it will appear under Recent runs."
              action={startPayoutRun}
            />
          )
        }
      />

      <StatStrip stats={chips.map((chip) => ({ label: chip.label, value: chip.value, meta: chip.sub }))} />

      {(counts.failed ?? 0) > 0 && activeFilter !== 'failed' && (
        <InlineNotice action={<Link href={hrefWith({ filter: 'failed', skip: undefined })}>Show failed</Link>}>
          {transfers(counts.failed ?? 0)} failed. The money is back in those couriers’ balances until a payout succeeds.
        </InlineNotice>
      )}

      {(params.rider || params.run) && (
        <InlineNotice
          tone="info"
          action={<Link href={hrefWith({ rider: undefined, run: undefined, skip: undefined })}>Show all</Link>}
        >
          {params.rider ? 'Showing one courier’s payouts.' : 'Showing one run’s payouts.'}
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
              <SearchBox placeholder="Courier, account or reference" />
            </ToolbarEnd>
          </>
        }
        footer={
          <PaginationControls
            skip={skip}
            limit={LIMIT}
            totalCount={result.totalCount}
            basePath="/payouts"
            searchParams={params}
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Courier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Paid to</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.data.map((payout) => (
              <TableRow key={payout._id} className="relative">
                <TableCell>
                  <RowLink href={`/payouts/${payout._id}`}>{personName(payout.rider, 'Deleted courier')}</RowLink>
                  <div className="text-[12.5px] whitespace-nowrap text-muted-foreground tabular-nums">
                    {formatDate(payout.createdAt)} · {payout.reference}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={payoutStatusVariant(payout.status)} dot>
                    {payoutStatusLabel(payout.status)}
                  </Badge>
                  {payout.failureReason && (
                    <div className="mt-1 max-w-[220px] truncate text-[12.5px] text-destructive" title={payout.failureReason}>
                      {payout.failureReason}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="whitespace-nowrap tabular-nums">{maskedAccount(payout.bankAccount)}</div>
                  <div className="text-[12.5px] text-muted-foreground">{payout.bankAccount?.accountName || '—'}</div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-foreground-secondary">
                  {payoutTriggerLabel(payout.trigger)}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">{naira(payout.amount)}</TableCell>
                <TableCell>
                  <RowChevron />
                </TableCell>
              </TableRow>
            ))}
            {result.data.length === 0 && (
              <EmptyRow colSpan={6} title="No payouts match" body="Clear the search or switch tabs." />
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
            {runs.length === 0 && <EmptyRow colSpan={7} title="No payout runs yet" />}
            {runs.map((run) => (
              <TableRow key={run._id} className="relative">
                <TableCell>
                  <RowLink href={`/payouts/runs/${run._id}`}>
                    {run.trigger === 'scheduled' ? `Daily · ${run.runKey}` : 'Manual run'}
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
            enabled: settings.payoutsEnabled,
            hourLagos: settings.payoutHourLagos,
            minAmount: settings.payoutMinAmount,
          }}
          canEdit={canEditSettings}
          description="Once a day, every courier owed at least the minimum is sent their whole balance by Paystack transfer. Transfer OTP must be off in the Paystack dashboard, and the Paystack balance funded, or transfers will wait or fail."
          save={updatePayoutSettings}
        />
      )}
    </PageStack>
  );
}
