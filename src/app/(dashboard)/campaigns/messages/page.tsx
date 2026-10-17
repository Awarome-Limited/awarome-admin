import { authedFetch, ApiError, SingleResponse } from '@/lib/api-client';
import { ApiErrorCard } from '@/components/api-error-card';
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
import { EmptyRow, ListCard, PageHeader, PageStack } from '@/components/page';

interface CampaignMessageRow {
  _id: string;
  user?: { firstName?: string; lastName?: string; email?: string } | string | null;
  campaign: string;
  step: string;
  status: string;
  reason?: string;
  channels: { channel: string; status: string; error?: string }[];
  sentAt?: string;
  deferredUntil?: string;
  createdAt: string;
}

const CAMPAIGN_FILTERS = [
  { key: '', label: 'All campaigns' },
  { key: 'activation', label: 'Marketplace activation' },
  { key: 'delivery-activation', label: 'Delivery activation' },
  { key: 'abandoned-cart', label: 'Abandoned cart' },
  { key: 'abandoned-checkout', label: 'Abandoned checkout' },
  { key: 'package-delivery', label: 'Abandoned delivery' },
  { key: 'winback', label: 'Win-back' },
];

const STATUS_FILTERS = [
  { key: '', label: 'All statuses' },
  { key: 'sent', label: 'Sent' },
  { key: 'partial', label: 'Partial' },
  { key: 'deferred', label: 'Deferred' },
  { key: 'skipped', label: 'Skipped' },
  { key: 'failed', label: 'Failed' },
];

function statusVariant(
  status: string
): 'positive' | 'warning' | 'info' | 'secondary' | 'destructive' {
  if (status === 'sent') return 'positive';
  if (status === 'partial') return 'warning';
  if (status === 'deferred') return 'info';
  if (status === 'failed') return 'destructive';
  return 'secondary';
}

function userLabel(user: CampaignMessageRow['user']) {
  if (!user || typeof user === 'string') return user || '—';
  return (
    [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || '—'
  );
}

function filterHref(params: Record<string, string | undefined>, patch: Record<string, string>) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...params, ...patch })) {
    if (v) next.set(k, v);
  }
  const qs = next.toString();
  return qs ? `/campaigns/messages?${qs}` : '/campaigns/messages';
}

export default async function CampaignMessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const campaign = params.campaign ?? '';
  const status = params.status ?? '';
  const user = params.user ?? '';

  const query = new URLSearchParams();
  query.set('limit', '100');
  if (campaign) query.set('campaign', campaign);
  if (status) query.set('status', status);
  if (user) query.set('user', user);

  let messages: CampaignMessageRow[];
  try {
    const result = await authedFetch<SingleResponse<CampaignMessageRow[]>>(
      `/admins/campaigns/messages?${query.toString()}`
    );
    messages = result.data;
  } catch (error) {
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Something went wrong.'}
      />
    );
  }

  return (
    <PageStack>
      <PageHeader
        back={{ href: '/campaigns', label: 'Campaigns' }}
        title="Campaign send log"
        subtitle={`Every claimed nudge and how it ended. Showing the latest ${messages.length} entries.`}
      />

      <ListCard
        toolbar={
          <>
            <SegmentedLinks
              active={campaign || 'all'}
              items={CAMPAIGN_FILTERS.map((f) => ({
                key: f.key || 'all',
                label: f.label,
                href: filterHref(params, { campaign: f.key }),
              }))}
            />
            <SegmentedLinks
              active={status || 'all'}
              items={STATUS_FILTERS.map((f) => ({
                key: f.key || 'all',
                label: f.label,
                href: filterHref(params, { status: f.key }),
              }))}
            />
          </>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Step</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Channels</TableHead>
              <TableHead>Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {messages.map((msg) => (
              <TableRow key={msg._id}>
                <TableCell>
                  <div>{userLabel(msg.user)}</div>
                  <div className="text-[12.5px] whitespace-nowrap text-muted-foreground tabular-nums">
                    {formatDate(msg.sentAt ?? msg.createdAt)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="whitespace-nowrap">{humanize(msg.step)}</div>
                  <div className="text-[12.5px] whitespace-nowrap text-muted-foreground">{humanize(msg.campaign)}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant(msg.status)} dot>
                    {humanize(msg.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="flex flex-wrap gap-1">
                    {msg.channels?.length
                      ? msg.channels.map((c) => (
                          <Badge key={c.channel} variant={c.status === 'failed' ? 'destructive' : 'secondary'}>
                            {humanize(c.channel)}
                            {c.status === 'failed' ? ' failed' : ''}
                          </Badge>
                        ))
                      : '—'}
                  </span>
                </TableCell>
                <TableCell className="max-w-[260px] truncate text-[13px] text-foreground-secondary">
                  {msg.status === 'deferred' && msg.deferredUntil
                    ? `Until ${formatDate(msg.deferredUntil)}`
                    : msg.reason || msg.channels?.find((c) => c.error)?.error || '—'}
                </TableCell>
              </TableRow>
            ))}
            {messages.length === 0 && (
              <EmptyRow colSpan={5} title="No messages match" body="Try another campaign or status." />
            )}
          </TableBody>
        </Table>
      </ListCard>
    </PageStack>
  );
}
