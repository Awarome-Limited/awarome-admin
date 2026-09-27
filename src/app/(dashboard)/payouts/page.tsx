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
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { getSession } from '@/lib/session';
import { hasPermission, PermissionAction, PermissionModule } from '@/lib/permissions';
import type { AdminPayoutRun, AdminRiderPayout, PayoutSettings } from '@/lib/types';
import { startPayoutRun } from './actions';
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[23px] font-bold tracking-tight text-foreground">Rider payouts</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Every Paystack transfer to a courier — what was sent, to which account, and where it
            stands.
            {settings &&
              (settings.payoutsEnabled
                ? ` Daily run at ${formatLagosHour(settings.payoutHourLagos)} Lagos time.`
                : ' Automatic payouts are off.')}
          </p>
        </div>
        {canPay && (
          <PayoutActionButton
            label={running ? 'Run in progress…' : 'Run payouts now'}
            title="Pay every courier now?"
            description={`Every courier owed at least ${naira(settings?.payoutMinAmount ?? 0)} with a verified account is sent their full balance by Paystack transfer. Couriers already paid today are only paid anything they have earned since.`}
            confirmLabel="Send payouts"
            successMessage="Payout run started — it will appear under Recent runs."
            action={startPayoutRun}
          />
        )}
      </div>

      {settings && <PayoutSettingsCard settings={settings} canEdit={canEditSettings} />}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {chips.map((chip) => (
          <div
            key={chip.label}
            className="flex flex-col gap-1 rounded-[12px] border border-border bg-card p-[13px_16px] shadow-[var(--shadow-card)]"
          >
            <span className="text-[12px] font-medium text-muted-foreground">{chip.label}</span>
            <span className="text-[20px] font-bold tabular-nums text-foreground">{chip.value}</span>
            <span className="text-[12px] text-muted-foreground">{chip.sub}</span>
          </div>
        ))}
      </div>

      {(params.rider || params.run) && (
        <div className="flex w-fit items-center gap-2 rounded-[9px] border border-border bg-card px-3 py-1.5 text-[13px] text-foreground-secondary">
          {params.rider ? "Showing one courier's payouts" : 'Showing one run’s payouts'}
          <Link
            href={hrefWith({ rider: undefined, run: undefined, skip: undefined })}
            className="font-semibold text-primary hover:underline"
          >
            Clear
          </Link>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => {
            const active = activeFilter === f.key;
            return (
              <Link
                key={f.key}
                href={hrefWith({ filter: f.key, skip: undefined })}
                className={cn(
                  'rounded-[9px] border px-3.5 py-[7px] text-[13px] font-semibold transition-colors',
                  active
                    ? 'border-transparent bg-brand-tint text-primary'
                    : 'border-border-strong bg-card text-foreground-secondary hover:bg-muted'
                )}
              >
                {f.label}
                <span className="ml-1.5 tabular-nums opacity-70">{filterCount(counts, f.key)}</span>
              </Link>
            );
          })}
        </div>
        <SearchBox placeholder="Search courier, account or reference…" />
      </div>

      <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Courier</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Paid to</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.map((payout) => (
                <TableRow key={payout._id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <Link href={`/payouts/${payout._id}`} className="font-medium hover:underline">
                        {personName(payout.rider, 'Deleted courier')}
                      </Link>
                      <span className="text-[12px] text-muted-foreground">{payout.rider?.phone || '—'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {naira(payout.amount)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant={payoutStatusVariant(payout.status)} dot>
                        {payoutStatusLabel(payout.status)}
                      </Badge>
                      {payout.failureReason && (
                        <span className="max-w-[220px] truncate text-[12px] text-destructive" title={payout.failureReason}>
                          {payout.failureReason}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="whitespace-nowrap">{maskedAccount(payout.bankAccount)}</span>
                      <span className="text-[12px] text-muted-foreground">
                        {payout.bankAccount?.accountName || '—'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{payoutTriggerLabel(payout.trigger)}</TableCell>
                  <TableCell>
                    <Link
                      href={`/payouts/${payout._id}`}
                      className="rounded bg-chip px-2 py-0.5 font-mono text-xs hover:underline"
                    >
                      {payout.reference}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(payout.createdAt)}</TableCell>
                </TableRow>
              ))}
              {result.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No payouts found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="border-t border-border px-4 py-3">
          <PaginationControls
            skip={skip}
            limit={LIMIT}
            totalCount={result.totalCount}
            basePath="/payouts"
            searchParams={params}
          />
        </div>
      </div>

      <div className="rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="border-b border-border px-[22px] py-[14px] text-[15px] font-semibold text-foreground">
          Recent runs
        </div>
        {runs.length === 0 ? (
          <p className="px-[22px] py-6 text-[13px] text-muted-foreground">No payout runs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started by</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Transfers</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead className="text-right">Skipped</TableHead>
                  <TableHead>Started</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run._id}>
                    <TableCell>
                      <Link href={`/payouts/runs/${run._id}`} className="font-medium hover:underline">
                        {run.trigger === 'scheduled' ? `Daily · ${run.runKey}` : 'Manual run'}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={RUN_STATUS_VARIANT[run.status] ?? 'secondary'} dot className="capitalize">
                        {run.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {run.initiatedBy ? personName(run.initiatedBy) : 'Scheduler'}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {naira(run.stats?.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{run.stats?.initiated ?? 0}</TableCell>
                    <TableCell className="text-right tabular-nums">{run.stats?.failed ?? 0}</TableCell>
                    <TableCell className="text-right tabular-nums">{run.stats?.skipped ?? 0}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(run.startedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
