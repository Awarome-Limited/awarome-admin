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
import { formatDate, humanize } from '@/lib/format';
import { SegmentedLinks } from '@/components/segmented';
import { EmptyRow, ListCard, PageHeader, PageStack, ToolbarEnd } from '@/components/page';
import { LOG_CATEGORIES, LOG_LEVELS } from '@/lib/activity-log-enums';
import { StatStrip } from '@/components/stat-strip';

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

  const tabHref = (key: string) => {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (category) p.set('category', category);
    if (params.from) p.set('from', params.from);
    if (params.to) p.set('to', params.to);
    if (key !== 'all') p.set('filter', key);
    const q = p.toString();
    return `/activity-logs${q ? `?${q}` : ''}`;
  };

  return (
    <PageStack>
      <PageHeader title="Activity logs" subtitle="An audit trail of every admin action on the platform." />

      <StatStrip stats={chips} />

      <ListCard
        toolbar={
          <>
            <SegmentedLinks
              active={activeFilter}
              items={LEVEL_FILTERS.map((f) => ({ key: f.key, label: f.label, href: tabHref(f.key) }))}
            />
            <CategorySelect value={category} search={search} activeFilter={activeFilter} params={params} />
            <DateRangeInputs params={params} search={search} activeFilter={activeFilter} category={category} />
            <ToolbarEnd>
              <SearchBox placeholder="Search actions" />
            </ToolbarEnd>
          </>
        }
        footer={
          <PaginationControls
            skip={skip}
            limit={LIMIT}
            totalCount={result.totalCount}
            basePath="/activity-logs"
            searchParams={params}
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Staff</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.data.map((log) => (
              <TableRow key={log._id}>
                <TableCell>
                  <div className="font-medium">{humanize(log.action)}</div>
                  <div className="text-[12.5px] whitespace-nowrap text-muted-foreground tabular-nums">
                    {humanize(log.category)} · {formatDate(log.createdAt)}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={levelVariant(log.level)} dot>
                    {humanize(log.level)}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[360px] truncate text-foreground-secondary">{log.description}</TableCell>
                <TableCell>{actorName(log.staff)}</TableCell>
              </TableRow>
            ))}
            {result.data.length === 0 && (
              <EmptyRow colSpan={4} title="No activity matches" body="Clear the search, category, dates or tab." />
            )}
          </TableBody>
        </Table>
      </ListCard>
    </PageStack>
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
      <select name="category" aria-label="Category" defaultValue={value} className="toolbar-select">
        <option value="">All categories</option>
        {LOG_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {humanize(c)}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="h-[38px] rounded-full border border-border bg-card px-3.5 text-[13.5px] font-medium text-foreground hover:bg-muted"
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
        aria-label="From"
        defaultValue={params.from ?? ''}
        className="toolbar-select pr-3.5 tabular-nums"
      />
      <span className="text-[13px] text-muted-foreground">–</span>
      <input
        type="date"
        name="to"
        aria-label="To"
        defaultValue={params.to ?? ''}
        className="toolbar-select pr-3.5 tabular-nums"
      />
      <button
        type="submit"
        className="h-[38px] rounded-full border border-border bg-card px-3.5 text-[13.5px] font-medium text-foreground hover:bg-muted"
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
