import Link from 'next/link';
import { ApiError } from '@/lib/api-client';
import { ApiErrorCard } from '@/components/api-error-card';
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
import { formatLagosDateTime } from '@/lib/format';
import { AUDIENCE_LABELS } from '@/lib/scheduled-push';
import type { AdminScheduledPush, ScheduledPushStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { getAudienceLists } from '../actions';
import { PushTabs } from '../_components/push-tabs';
import { getScheduledPushes } from './actions';
import { ScheduledPushActions } from './_components/scheduled-push-actions';

const PAGE_SIZE = 20;
const BASE_PATH = '/push-notifications/scheduled';

// `key` is the URL value; `api` is what the backend filters on.
const FILTERS = [
  { key: '', label: 'Upcoming', api: 'scheduled' },
  { key: 'sent', label: 'Sent', api: 'sent' },
  { key: 'failed', label: 'Failed', api: 'failed' },
  { key: 'cancelled', label: 'Cancelled', api: 'cancelled' },
  { key: 'all', label: 'All', api: '' },
];

const STATUS_BADGES: Record<
  ScheduledPushStatus,
  { label: string; variant: 'info' | 'warning' | 'positive' | 'destructive' | 'secondary' }
> = {
  scheduled: { label: 'Scheduled', variant: 'info' },
  sending: { label: 'Sending', variant: 'warning' },
  sent: { label: 'Sent', variant: 'positive' },
  failed: { label: 'Failed', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'secondary' },
};

function creatorName(creator: AdminScheduledPush['createdBy']) {
  if (!creator || typeof creator === 'string') return '—';
  return [creator.firstName, creator.lastName].filter(Boolean).join(' ') || creator.email || '—';
}

function ResultCell({ push }: { push: AdminScheduledPush }) {
  if (push.status === 'sending') {
    return <span className="text-muted-foreground">Going out now…</span>;
  }
  if (push.result && (push.status === 'sent' || push.result.total > 0)) {
    const { sent, failed, total } = push.result;
    return (
      <div className="whitespace-nowrap">
        <div className="font-semibold tabular-nums text-foreground">
          {sent.toLocaleString()} delivered
          {failed > 0 && (
            <span className="font-normal text-muted-foreground"> · {failed.toLocaleString()} failed</span>
          )}
        </div>
        <div className="text-[12px] tabular-nums text-muted-foreground">
          of {total.toLocaleString()} device{total === 1 ? '' : 's'}
        </div>
      </div>
    );
  }
  if (push.error) {
    return (
      <span className="line-clamp-2 max-w-[260px] text-[12.5px] text-destructive" title={push.error}>
        {push.error}
      </span>
    );
  }
  return <span className="text-muted-foreground">—</span>;
}

export default async function ScheduledPushesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const filter = FILTERS.find((f) => f.key === (params.status ?? '')) ?? FILTERS[0];
  const skip = Math.max(Number(params.skip) || 0, 0);

  let page: Awaited<ReturnType<typeof getScheduledPushes>>;
  let lists: Awaited<ReturnType<typeof getAudienceLists>>;
  try {
    [page, lists] = await Promise.all([
      getScheduledPushes({ status: filter.api, skip, limit: PAGE_SIZE }),
      getAudienceLists().catch(() => []),
    ]);
  } catch (error) {
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Something went wrong.'}
      />
    );
  }

  const listOptions = lists.map(({ _id, name }) => ({ _id, name }));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[23px] font-bold tracking-tight text-foreground">
          Push notifications
        </h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Pushes queued to go out later. All times are Lagos time (WAT).
        </p>
      </div>

      <PushTabs active="scheduled" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <Link
              key={f.label}
              href={f.key ? `${BASE_PATH}?status=${f.key}` : BASE_PATH}
              aria-current={filter.key === f.key ? 'page' : undefined}
              className={cn(
                'rounded-full border px-3 py-1 text-[12px] font-medium',
                filter.key === f.key
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <Link
          href={`${BASE_PATH}/new`}
          className="inline-flex items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-4 py-[9px] text-[13.5px] font-semibold text-primary-foreground shadow-[var(--shadow-card)] transition-all hover:brightness-110"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          Schedule pushes
        </Link>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sends</TableHead>
                <TableHead>Push</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Scheduled by</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.data.map((push) => {
                const badge = STATUS_BADGES[push.status] ?? STATUS_BADGES.scheduled;
                return (
                  <TableRow key={push._id}>
                    <TableCell className="whitespace-nowrap font-semibold tabular-nums text-foreground">
                      {formatLagosDateTime(push.sendAt)}
                    </TableCell>
                    <TableCell className="max-w-[340px]">
                      <span className="block truncate font-semibold text-foreground">{push.title}</span>
                      <span className="block truncate text-[12.5px] text-muted-foreground">
                        {push.message}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {push.audience === 'list' ? (
                        <span>
                          {push.audienceListName ?? 'Saved list'}
                          <span className="ml-1.5 text-[11.5px] text-muted-foreground">list</span>
                        </span>
                      ) : (
                        (AUDIENCE_LABELS[push.audience] ?? push.audience)
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <ResultCell push={push} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{creatorName(push.createdBy)}</TableCell>
                    <TableCell className="text-right">
                      {push.status === 'scheduled' && (
                        <ScheduledPushActions push={push} lists={listOptions} />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {page.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    {filter.key === '' ? (
                      <>
                        Nothing scheduled yet.{' '}
                        <Link href={`${BASE_PATH}/new`} className="font-semibold text-primary hover:underline">
                          Schedule pushes
                        </Link>
                      </>
                    ) : (
                      `No ${filter.label.toLowerCase()} pushes.`
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {page.totalCount > PAGE_SIZE && (
        <PaginationControls
          skip={skip}
          limit={PAGE_SIZE}
          totalCount={page.totalCount}
          basePath={BASE_PATH}
          searchParams={{ status: filter.key || undefined }}
        />
      )}
    </div>
  );
}
