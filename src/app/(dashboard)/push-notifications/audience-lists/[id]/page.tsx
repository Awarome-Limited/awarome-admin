import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ApiError } from '@/lib/api-client';
import { ApiErrorCard } from '@/components/api-error-card';
import { ConfirmActionButton } from '@/components/confirm-action-button';
import { AvatarInitials } from '@/components/avatar-initials';
import { formatDate, formatPhone } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DetailHeader, EmptyRow, PageStack, Panel, RowLink, StatCards } from '@/components/page';
import {
  getAudienceList,
  updateAudienceListName,
  replaceAudienceListContacts,
  deleteAudienceList,
  type ContactsPayload,
} from '../../actions';
import { RenameForm } from './_components/rename-form';
import { ReplaceContactsForm } from './_components/replace-contacts-form';

export default async function AudienceListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let list: Awaited<ReturnType<typeof getAudienceList>>;
  try {
    list = await getAudienceList(id);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Something went wrong.'}
      />
    );
  }

  async function handleRename(name: string) {
    'use server';
    return updateAudienceListName(id, name);
  }

  async function handleReplaceContacts(contacts: ContactsPayload) {
    'use server';
    return replaceAudienceListContacts(id, contacts);
  }

  async function handleDelete() {
    'use server';
    await deleteAudienceList(id);
    redirect('/push-notifications');
  }

  const totalEmails = list.totalEmails ?? 0;
  const contactCount = list.totalPhones + totalEmails;
  // One contact can match both a customer and a vendor-agent account.
  const matchRate =
    contactCount > 0
      ? Math.min(Math.round((list.matchedCount / contactCount) * 100), 100)
      : 0;

  return (
    <PageStack>
      <DetailHeader
        back={{ href: '/push-notifications', label: 'Push notifications' }}
        title={list.name}
        status={<Badge variant="secondary">Audience list</Badge>}
        meta={[list.createdAt && `Created ${formatDate(list.createdAt)}`]}
        actions={
          <Link href="/push-notifications" className={buttonVariants()}>
            Send a push
          </Link>
        }
      />

      <StatCards
        stats={[
          {
            label: 'Contacts uploaded',
            value: contactCount.toLocaleString(),
            meta: `${list.totalPhones.toLocaleString()} phones · ${totalEmails.toLocaleString()} emails`,
          },
          { label: 'Matched users', value: list.matchedCount.toLocaleString(), meta: 'Reachable by push' },
          {
            label: 'Match rate',
            value: `${matchRate}%`,
            meta: matchRate < 50 ? 'Most contacts have no Awarome account' : undefined,
          },
        ]}
      />

      <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <Panel
          flush
          title="Matched users"
          aside={<span className="text-[13px] text-muted-foreground tabular-nums">{list.matchedCount.toLocaleString()}</span>}
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.users.map((user) => {
                  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
                  const joined = (user as { createdAt?: string }).createdAt;
                  return (
                    <TableRow key={user._id} className="relative">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <AvatarInitials name={fullName || undefined} />
                          <div className="min-w-0">
                            <RowLink href={`/users/${user._id}`}>{fullName || 'No name yet'}</RowLink>
                            <div className="truncate text-[12.5px] text-muted-foreground">{user.email || 'No email'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-foreground-secondary tabular-nums">
                        {formatPhone(user.phone)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-foreground-secondary tabular-nums">
                        {joined ? formatDate(joined) : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {list.users.length === 0 && (
                  <EmptyRow colSpan={3} title="No matched users" body="None of these contacts has an Awarome account yet." />
                )}
              </TableBody>
            </Table>
          </div>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="Rename list" description="The name shown when picking an audience.">
            <RenameForm currentName={list.name} action={handleRename} />
          </Panel>
          <Panel
            title="Replace contacts"
            description="Paste or upload a new set of phone numbers and emails. It replaces every current contact, and matches are recalculated."
          >
            <ReplaceContactsForm action={handleReplaceContacts} />
          </Panel>
          <Panel
            title="Delete list"
            description="Permanently removes the list. Scheduled pushes that target it will fail when they’re due."
          >
            <div>
              <ConfirmActionButton
                label="Delete audience list"
                title="Delete this audience list?"
                description="This permanently removes the list. Scheduled pushes that target it will fail when they are due."
                action={handleDelete}
              />
            </div>
          </Panel>
        </div>
      </section>
    </PageStack>
  );
}
