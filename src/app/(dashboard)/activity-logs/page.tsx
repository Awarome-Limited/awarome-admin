import Link from 'next/link';
import { authedFetch, ApiError, PaginatedResponse } from '@/lib/api-client';
import { AdminActivityLog } from '@/lib/types';
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
import { LOG_CATEGORIES, LOG_LEVELS } from '@/lib/activity-log-enums';

const LIMIT = 30;

const LEVEL_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'info', label: 'Info' },
  { key: 'warning', label: 'Warning' },
  { key: 'error', label: 'Error' },
  { key: 'debug', label: 'Debug' },
] as const;

function actorName(actor: AdminActivityLog['staff']) {
  if (!actor || typeof actor === 'string') return actor || '—';
  return [actor.firstName, actor.lastName].filter(Boolean).join(' ') || actor.email || '—';
}

function levelVariant(level: string): 'destructive' | 'warning' | 'info' | 'secondary' {
  if (level === 'error') return 'destructive';
  if (level === 'warning') return 'warning';
  if (level === 'debug') return 'secondary';
  return 'info';
}

async function safeCount(url: string): Promise<number> {
  try {
    const r = await authedFetch<PaginatedResponse<unknown>>(url);
    return r.totalCount ?? 0;
  } catch {
    return 0;
  }
}

export default async function ActivityLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const skip = Number(params.skip ?? 0);
  const search = params.search ?? '';
  const activeFilter = params.filter ?? 'all';
  const category = params.category ?? '';

  const query = new URLSearchParams();
  query.set('skip', String(skip));
  query.set('limit', String(LIMIT));
  if (search) query.set('search', search);
  if (activeFilter !== 'all') query.set('level', activeFilter);
  if (category) query.set('category', category);
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);

  let result: PaginatedResponse<AdminActivityLog>;
  let totalCount = 0;
  let errorCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  try {
    [result, totalCount, errorCount, warningCount, infoCount] = await Promise.all([
      authedFetch<PaginatedResponse<AdminActivityLog>>(`/admins/activity-logs?${query.toString()}`),
      safeCount('/admins/activity-logs?limit=1'),
      safeCount('/admins/activity-logs?level=error&limit=1'),
      safeCount('/admins/activity-logs?level=warning&limit=1'),
      safeCount('/admins/activity-logs?level=info&limit=1'),
    ]);
  } catch (error) {
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Something went wrong.'}
      />
    );
  }

  const chips = [
    { label: 'Total events', value: totalCount.toLocaleString() },
    { label: 'Info', value: infoCount.toLocaleString() },
    { label: 'Warnings', value: warningCount.toLocaleString() },
    { label: 'Errors', value: errorCount.toLocaleString() },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[23px] font-bold tracking-tight text-foreground">Activity logs</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Audit trail of all admin actions on the platform
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {chips.map((chip) => (
          <div
            key={chip.label}
            className="flex flex-col gap-1 rounded-[12px] border border-border bg-card p-[13px_16px] shadow-[var(--shadow-card)]"
          >
            <span className="text-[12px] font-medium text-muted-foreground">{chip.label}</span>
            <span className="text-[20px] font-bold tabular-nums text-foreground">{chip.value}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {LEVEL_FILTERS.map((f) => {
            const active = activeFilter === f.key;
            const href = (() => {
              const p = new URLSearchParams();
              if (search) p.set('search', search);
              if (category) p.set('category', category);
              if (params.from) p.set('from', params.from);
              if (params.to) p.set('to', params.to);
              if (f.key !== 'all') p.set('filter', f.key);
              const s = p.toString();
              return `/activity-logs${s ? `?${s}` : ''}`;
            })();
            return (
              <Link
                key={f.key}
                href={href}
                className={cn(
                  'rounded-[9px] border px-3.5 py-[7px] text-[13px] font-semibold transition-colors',
                  active
                    ? 'border-transparent bg-brand-tint text-primary'
                    : 'border-border-strong bg-card text-foreground-secondary hover:bg-muted'
                )}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CategorySelect value={category} search={search} activeFilter={activeFilter} params={params} />
          <DateRangeInputs params={params} search={search} activeFilter={activeFilter} category={category} />
          <SearchBox placeholder="Search actions…" />
        </div>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Level</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.map((log) => (
                <TableRow key={log._id}>
                  <TableCell>
                    <Badge variant={levelVariant(log.level)} dot>{log.level}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="rounded bg-chip px-2 py-0.5 text-xs font-medium text-foreground-secondary">
                      {log.category}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-primary">{log.action}</span>
                  </TableCell>
                  <TableCell className="max-w-[280px] truncate text-muted-foreground">
                    {log.description}
                  </TableCell>
                  <TableCell className="font-medium">{actorName(log.staff)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(log.createdAt).split(',')[0]}
                  </TableCell>
                </TableRow>
              ))}
              {result.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No activity logs found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="border-t border-border px-4 py-3">
          <PaginationControls
            skip={result.skip}
            limit={result.limit || LIMIT}
            totalCount={result.totalCount}
            basePath="/activity-logs"
            searchParams={params}
          />
        </div>
      </div>
    </div>
  );
}

function CategorySelect({
  value,
  search,
  activeFilter,
  params,
}: {
  value: string;
  search: string;
  activeFilter: string;
  params: Record<string, string | undefined>;
}) {
  return (
    <form method="get" action="/activity-logs" className="contents">
      {search && <input type="hidden" name="search" value={search} />}
      {activeFilter !== 'all' && <input type="hidden" name="filter" value={activeFilter} />}
      {params.from && <input type="hidden" name="from" value={params.from} />}
      {params.to && <input type="hidden" name="to" value={params.to} />}
      <select
        name="category"
        defaultValue={value}
        className="h-[34px] rounded-[9px] border border-border-strong bg-card px-3 text-[13px] font-semibold text-foreground-secondary outline-none"
      >
        <option value="">All categories</option>
        {LOG_CATEGORIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <button
        type="submit"
        className="h-[34px] rounded-[9px] border border-border-strong bg-card px-3 text-[13px] font-semibold text-foreground-secondary hover:bg-muted"
      >
        Go
      </button>
    </form>
  );
}

function DateRangeInputs({
  params,
  search,
  activeFilter,
  category,
}: {
  params: Record<string, string | undefined>;
  search: string;
  activeFilter: string;
  category: string;
}) {
  return (
    <form method="get" action="/activity-logs" className="flex items-center gap-1.5">
      {search && <input type="hidden" name="search" value={search} />}
      {activeFilter !== 'all' && <input type="hidden" name="filter" value={activeFilter} />}
      {category && <input type="hidden" name="category" value={category} />}
      <input
        type="date"
        name="from"
        defaultValue={params.from ?? ''}
        className="h-[34px] rounded-[9px] border border-border-strong bg-card px-2.5 text-[13px] text-foreground-secondary outline-none"
      />
      <span className="text-[13px] text-muted-foreground">–</span>
      <input
        type="date"
        name="to"
        defaultValue={params.to ?? ''}
        className="h-[34px] rounded-[9px] border border-border-strong bg-card px-2.5 text-[13px] text-foreground-secondary outline-none"
      />
      <button
        type="submit"
        className="h-[34px] rounded-[9px] border border-border-strong bg-card px-3 text-[13px] font-semibold text-foreground-secondary hover:bg-muted"
      >
        Go
      </button>
      {(params.from || params.to) && (
        <Link
          href={`/activity-logs${(() => {
            const p = new URLSearchParams();
            if (search) p.set('search', search);
            if (activeFilter !== 'all') p.set('filter', activeFilter);
            if (category) p.set('category', category);
            const s = p.toString();
            return s ? `?${s}` : '';
          })()}`}
          className="text-[13px] text-muted-foreground hover:text-foreground"
        >
          Clear dates
        </Link>
      )}
    </form>
  );
}
