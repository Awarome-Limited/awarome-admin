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
import { AUDIENCE_LABELS, repeatLabel } from '@/lib/scheduled-push';
import type { AdminScheduledPush, ScheduledPushStatus } from '@/lib/types';
import { buttonVariants } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { SegmentedLinks } from '@/components/segmented';
import { EmptyRow, ListCard, PageHeader, PageStack } from '@/components/page';
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
  sending: { label: 'Sending', variant: 'info' },
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
    <PageStack>
      <PageHeader
        title="Push notifications"
        subtitle="Pushes queued to go out later."
        actions={
          <>
            <PushTabs active="scheduled" />
            <Link href={`${BASE_PATH}/new`} className={buttonVariants()}>
              <Plus />
              Schedule pushes
            </Link>
          </>
        }
      />

      <ListCard
        toolbar={
          <SegmentedLinks
            active={filter.key || 'upcoming'}
            items={FILTERS.map((f) => ({
              key: f.key || 'upcoming',
              label: f.label,
              href: f.key ? `${BASE_PATH}?status=${f.key}` : BASE_PATH,
            }))}
          />
        }
        footer={
          page.totalCount > PAGE_SIZE && (
            <PaginationControls
              skip={skip}
              limit={PAGE_SIZE}
              totalCount={page.totalCount}
              basePath={BASE_PATH}
              searchParams={{ status: filter.key || undefined }}
            />
          )
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sends</TableHead>
              <TableHead>Push</TableHead>
              <TableHead>Audience</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Result</TableHead>
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
                  <TableCell className="whitespace-nowrap tabular-nums">
                    <div className="font-medium">{formatLagosDateTime(push.sendAt)}</div>
                    <div className="text-[12.5px] text-muted-foreground">
                      {push.seriesId
                        ? `${repeatLabel(push.repeatEveryDays)}${
                            push.occurrence && push.occurrenceCount ? ` · ${push.occurrence} of ${push.occurrenceCount}` : ''
                          }`
                        : `By ${creatorName(push.createdBy)}`}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[340px]">
                    <span className="block truncate font-medium">{push.title}</span>
                    <span className="block truncate text-[12.5px] text-muted-foreground">{push.message}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {push.audience === 'list' ? (
                      <Badge variant="secondary">{push.audienceListName ?? 'Saved list'}</Badge>
                    ) : (
                      <Badge variant="secondary">{AUDIENCE_LABELS[push.audience] ?? push.audience}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={badge.variant} dot>
                      {badge.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ResultCell push={push} />
                  </TableCell>
                  <TableCell className="text-right">
                    {push.status === 'scheduled' && <ScheduledPushActions push={push} lists={listOptions} />}
                  </TableCell>
                </TableRow>
              );
            })}
            {page.data.length === 0 && (
              <EmptyRow
                colSpan={6}
                title={filter.key === '' ? 'Nothing scheduled yet' : `No ${filter.label.toLowerCase()} pushes`}
                body={filter.key === '' ? 'Schedule pushes to send them later, once or on repeat.' : undefined}
              />
            )}
          </TableBody>
        </Table>
      </ListCard>
    </PageStack>
  );
}
