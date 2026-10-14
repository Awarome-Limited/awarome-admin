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
import { formatDate, formatNaira } from '@/lib/format';
import { cn } from '@/lib/utils';
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[23px] font-bold tracking-tight text-foreground">Business payouts</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Every Paystack transfer to an Awarome Business account: what its pay-on-delivery runs
            collected, less the delivery fee and Paystack&apos;s collection fee. Businesses are paid
            the day after delivery (T+1).
            {settings &&
              (settings.businessPayoutsEnabled
                ? ` Daily run at ${formatLagosHour(settings.businessPayoutHourLagos)} Lagos time.`
                : ' Automatic payouts are off.')}
          </p>
        </div>
        {canPay && (
          <PayoutActionButton
            label={running ? 'Run in progress…' : 'Run business payouts now'}
            title="Pay every business now?"
            description={`Every business owed at least ${naira(settings?.businessPayoutMinAmount ?? 0)} for deliveries made before today, with a verified account, is sent that amount by Paystack transfer.`}
            confirmLabel="Send payouts"
            successMessage="Business payout run started — it will appear under Recent runs."
            action={startBusinessPayoutRun}
          />
        )}
      </div>

      {settings && (
        <PayoutSettingsCard
          settings={{
            enabled: settings.businessPayoutsEnabled,
            hourLagos: settings.businessPayoutHourLagos,
            minAmount: settings.businessPayoutMinAmount,
          }}
          canEdit={canEditSettings}
          description="Once a day, every business is sent what its deliveries collected before today, if it comes to at least the minimum. Smaller balances roll over to the next day. Transfer OTP must be turned off in the Paystack dashboard, and the Paystack balance funded, or transfers will wait or fail."
          save={updateBusinessPayoutSettings}
        />
      )}

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

      {(params.business || params.run) && (
        <div className="flex w-fit items-center gap-2 rounded-[9px] border border-border bg-card px-3 py-1.5 text-[13px] text-foreground-secondary">
          {params.business ? "Showing one business's payouts" : 'Showing one run’s payouts'}
          <Link
            href={hrefWith({ business: undefined, run: undefined, skip: undefined })}
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
        <SearchBox placeholder="Search business, account or reference…" />
      </div>

      <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Deliveries</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Paid to</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.map((payout) => (
                <TableRow key={payout._id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <Link href={`/business-payouts/${payout._id}`} className="font-medium hover:underline">
                        {payout.business?.name ?? 'Deleted business'}
                      </Link>
                      <span className="font-mono text-[11px] text-muted-foreground">{payout.reference}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatNaira(payout.amountKobo)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{payout.deliveryCount}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant={businessPayoutStatusVariant(payout.status)} dot>
                        {businessPayoutStatusLabel(payout.status)}
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
                      <span className="whitespace-nowrap">{maskedAccount(payout.bankSnapshot)}</span>
                      <span className="text-[12px] text-muted-foreground">{payout.bankSnapshot?.accountName || '—'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {payoutTriggerLabel(payout.trigger ?? 'scheduled')}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(payout.createdAt)}</TableCell>
                </TableRow>
              ))}
              {result.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No business payouts found.
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
            basePath="/business-payouts"
            searchParams={params}
          />
        </div>
      </div>

      <div className="rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="border-b border-border px-[22px] py-[14px] text-[15px] font-semibold text-foreground">
          Recent runs
        </div>
        {runs.length === 0 ? (
          <p className="px-[22px] py-6 text-[13px] text-muted-foreground">No business payout runs yet.</p>
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
                      <Link href={`/business-payouts/runs/${run._id}`} className="font-medium hover:underline">
                        {run.trigger === 'scheduled' ? `Daily · ${run.runKey.replace(/^business-/, '')}` : 'Manual run'}
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
                    <TableCell className="text-right font-semibold tabular-nums">{naira(run.stats?.totalAmount)}</TableCell>
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
