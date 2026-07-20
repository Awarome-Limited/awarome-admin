import Link from 'next/link';
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
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

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
    <>
      <div className="flex flex-wrap items-start justify-between gap-4 pb-[18px]">
        <div>
          <h1 className="text-[23px] font-bold tracking-tight text-foreground">
            Campaign send log
          </h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Every claimed nudge and how it ended — the audit trail behind{' '}
            <Link href="/campaigns" className="text-primary underline-offset-2 hover:underline">
              Campaigns
            </Link>
            . Showing the latest {messages.length} entries.
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {CAMPAIGN_FILTERS.map((f) => (
          <Link
            key={f.key || 'all'}
            href={filterHref(params, { campaign: f.key })}
            className={cn(
              'rounded-full border px-3 py-1 text-[12px] font-medium',
              campaign === f.key
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:text-foreground'
            )}
          >
            {f.label}
          </Link>
        ))}
        <span className="mx-1.5 self-center text-border">|</span>
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.key || 'all'}
            href={filterHref(params, { status: f.key })}
            className={cn(
              'rounded-full border px-3 py-1 text-[12px] font-medium',
              status === f.key
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:text-foreground'
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {messages.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          No campaign messages match these filters yet.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Step</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Channels</TableHead>
              <TableHead>Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {messages.map((msg) => (
              <TableRow key={msg._id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDate(msg.sentAt ?? msg.createdAt)}
                </TableCell>
                <TableCell>{userLabel(msg.user)}</TableCell>
                <TableCell className="whitespace-nowrap">{msg.campaign}</TableCell>
                <TableCell className="whitespace-nowrap">{msg.step}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(msg.status)}>{msg.status}</Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap text-[12px] text-muted-foreground">
                  {msg.channels?.length
                    ? msg.channels
                        .map((c) => `${c.channel}${c.status === 'failed' ? ' ✕' : ' ✓'}`)
                        .join('  ')
                    : '—'}
                </TableCell>
                <TableCell className="max-w-[240px] truncate text-[12px] text-muted-foreground">
                  {msg.status === 'deferred' && msg.deferredUntil
                    ? `until ${formatDate(msg.deferredUntil)}`
                    : msg.reason ||
                      msg.channels?.find((c) => c.error)?.error ||
                      '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
