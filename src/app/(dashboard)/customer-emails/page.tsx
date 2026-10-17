import { authedFetch, PaginatedResponse } from '@/lib/api-client';
import { AdminActivityLog } from '@/lib/types';
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
import { EmptyRow, ListCard, PageHeader, PageStack } from '@/components/page';
import { getEmailPreset, templateIdFromKey } from '@/lib/email-presets';
import { getEmailTemplates } from './actions';
import { CustomerEmailComposer } from './_components/customer-email-composer';

const RECENT_LIMIT = 8;

function senderName(actor: AdminActivityLog['staff']) {
  if (!actor || typeof actor === 'string') return '—';
  return [actor.firstName, actor.lastName].filter(Boolean).join(' ') || actor.email || '—';
}

function metaString(log: AdminActivityLog, key: string): string {
  const value = log.metadata?.[key];
  return typeof value === 'string' ? value : '';
}

function recipientList(log: AdminActivityLog): string[] {
  const value = log.metadata?.recipients;
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

export default async function CustomerEmailsPage() {
  // Sends are recorded as activity logs rather than in their own collection, so
  // they stay searchable alongside every other admin action. A failure here
  // must not take the composer down with it — that's the part of the page
  // people came for.
  const [templates, recent] = await Promise.all([
    getEmailTemplates(),
    authedFetch<PaginatedResponse<AdminActivityLog>>(
      `/admins/activity-logs?action=customer-email-sent&limit=${RECENT_LIMIT}&skip=0`
    ).catch(() => null),
  ]);

  return (
    <PageStack>
      <PageHeader
        title="Customer emails"
        subtitle="Send a one-off email when something has gone wrong: a batch that didn’t fill, a late order, a refund that needs explaining."
      />

      <CustomerEmailComposer initialTemplates={templates} />

      <ListCard title="Recently sent" description="Every send is also recorded in Activity logs.">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Recipients</TableHead>
              <TableHead>Sent by</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recent?.data.map((log) => {
              const recipients = recipientList(log);
              const presetId = metaString(log, 'presetId');
              const savedId = templateIdFromKey(presetId);
              const label = savedId
                ? (templates.find((template) => template._id === savedId)?.name ?? 'Saved template')
                : (getEmailPreset(presetId)?.label ?? (presetId ? humanize(presetId) : 'Custom'));

              return (
                <TableRow key={log._id}>
                  <TableCell className="max-w-[340px]">
                    <span className="block truncate font-medium">{metaString(log, 'subject') || log.description}</span>
                    <span className="block text-[12.5px] whitespace-nowrap text-muted-foreground tabular-nums">
                      {formatDate(log.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{label}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[280px]">
                    <span className="block truncate text-foreground-secondary">
                      {recipients.length === 0
                        ? '—'
                        : recipients.length === 1
                          ? recipients[0]
                          : `${recipients[0]} and ${recipients.length - 1} more`}
                    </span>
                  </TableCell>
                  <TableCell className="text-foreground-secondary">{senderName(log.staff)}</TableCell>
                </TableRow>
              );
            })}
            {(!recent || recent.data.length === 0) && (
              <EmptyRow
                colSpan={4}
                title={recent ? 'No emails sent yet' : 'Couldn’t load recent sends'}
              />
            )}
          </TableBody>
        </Table>
      </ListCard>
    </PageStack>
  );
}
