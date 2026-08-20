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
import { formatDate } from '@/lib/format';
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
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[23px] font-bold tracking-tight text-foreground">
          Customer emails
        </h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Send a one-off email when something has gone wrong — a batch that
          didn’t fill, a late order, a refund that needs explaining.
        </p>
      </div>

      <CustomerEmailComposer initialTemplates={templates} />

      <div className="pt-1">
        <h2 className="text-[17px] font-bold tracking-tight text-foreground">
          Recently sent
        </h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Every send is recorded in Activity Logs under “customer-email-sent”.
        </p>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Preset</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Sent by</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent?.data.map((log) => {
                const recipients = recipientList(log);
                const presetId = metaString(log, 'presetId');
                const savedId = templateIdFromKey(presetId);
                const label = savedId
                  ? (templates.find((template) => template._id === savedId)?.name ??
                    'Saved template')
                  : (getEmailPreset(presetId)?.label ?? (presetId || 'custom'));
                const known = savedId
                  ? templates.some((template) => template._id === savedId)
                  : !!getEmailPreset(presetId);

                return (
                  <TableRow key={log._id}>
                    <TableCell className="max-w-[320px]">
                      <span className="block truncate font-semibold text-foreground">
                        {metaString(log, 'subject') || log.description}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={known ? 'info' : 'outline'}>{label}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[280px]">
                      <span className="block truncate text-muted-foreground">
                        {recipients.length === 0
                          ? '—'
                          : recipients.length === 1
                            ? recipients[0]
                            : `${recipients[0]} +${recipients.length - 1} more`}
                      </span>
                    </TableCell>
                    <TableCell>{senderName(log.staff)}</TableCell>
                    <TableCell>{formatDate(log.createdAt)}</TableCell>
                  </TableRow>
                );
              })}
              {(!recent || recent.data.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    {recent ? 'No emails sent yet.' : 'Could not load recent sends.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
