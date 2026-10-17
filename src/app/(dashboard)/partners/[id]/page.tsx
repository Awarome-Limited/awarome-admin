import Link from 'next/link';
import { notFound } from 'next/navigation';
import { authedFetch, ApiError, PaginatedResponse, SingleResponse } from '@/lib/api-client';
import {
  AdminPartner,
  AdminPartnerApiKey,
  AdminPartnerUser,
  AdminWallet,
} from '@/lib/types';
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
import { formatDate, formatNaira, formatPhone, humanize } from '@/lib/format';
import { AvatarInitials } from '@/components/avatar-initials';
import { buttonVariants } from '@/components/ui/button';
import {
  DetailHeader,
  EmptyRow,
  InlineNotice,
  PageStack,
  Panel,
  StatCards,
} from '@/components/page';
import { ApiAccessCard } from '../_components/api-access-card';
import { IssueKeyDialog } from '../_components/issue-key-dialog';
import { AddContactDialog } from '../_components/add-contact-dialog';
import { RevokeKeyButton } from '../_components/revoke-key-button';

/** A missing sub-resource must not take the whole page down with it. */
async function safeList<T>(url: string): Promise<T[]> {
  try {
    const r = await authedFetch<SingleResponse<T[]> | PaginatedResponse<T>>(url);
    return (r.data as T[]) ?? [];
  } catch {
    return [];
  }
}

export default async function PartnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let partner: AdminPartner;
  let keys: AdminPartnerApiKey[] = [];
  let contacts: AdminPartnerUser[] = [];

  try {
    const [partnerResponse, keyList, contactList] = await Promise.all([
      authedFetch<SingleResponse<AdminPartner>>(`/admins/partners/${id}`),
      safeList<AdminPartnerApiKey>(`/admins/partners/${id}/keys`),
      safeList<AdminPartnerUser>(`/admins/partners/${id}/users`),
    ]);
    partner = partnerResponse.data;
    keys = keyList;
    contacts = contactList;
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Something went wrong.'}
      />
    );
  }

  let wallet: AdminWallet | null = null;
  if (partner.wallet) {
    try {
      const r = await authedFetch<
        SingleResponse<{ wallet: AdminWallet }>
      >(`/admins/wallets/${partner.wallet}`);
      wallet = r.data.wallet;
    } catch {
      wallet = null;
    }
  }

  const activeKeys = keys.filter((k) => k.status === 'active');
  const lowOnFunds =
    wallet != null &&
    (partner.lowBalanceThreshold ?? 0) > 0 &&
    wallet.balance < (partner.lowBalanceThreshold ?? 0);

  return (
    <PageStack>
      <DetailHeader
        back={{ href: '/partners', label: 'All API partners' }}
        avatar={<AvatarInitials name={partner.name || undefined} size="lg" shape="store" />}
        title={partner.name || 'No name yet'}
        status={
          <Badge variant={partner.apiEnabled ? 'positive' : 'secondary'} dot={partner.apiEnabled}>
            {partner.apiEnabled ? 'API enabled' : 'API off'}
          </Badge>
        }
        meta={[partner.email, partner.phone && formatPhone(partner.phone)]}
      />

      <StatCards
        stats={[
          {
            label: 'Wallet balance',
            value: wallet ? formatNaira(wallet.balance) : '—',
            meta: wallet?.lastFundedAt ? `Last funded ${formatDate(wallet.lastFundedAt)}` : 'Never funded',
          },
          {
            label: 'Low-balance alert',
            value: partner.lowBalanceThreshold ? formatNaira(partner.lowBalanceThreshold) : 'Off',
          },
          { label: 'Active keys', value: activeKeys.length.toLocaleString(), meta: `${keys.length} issued` },
          { label: 'Contacts', value: contacts.length.toLocaleString() },
        ]}
      />

      {/*
        Funding is manual, so a partner at zero fails every delivery until ops
        notices. Say so here rather than leaving it to the list page.
      */}
      {lowOnFunds && (
        <InlineNotice
          action={
            partner.wallet && <Link href={`/payments/wallets/${partner.wallet}`}>Top up now</Link>
          }
        >
          Balance is running low. Deliveries fail with a payment error once the wallet can’t cover the fee.
        </InlineNotice>
      )}

      <section className="grid items-start gap-4 lg:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-4">
          <Panel
            title="Wallet"
            description="Every delivery is charged against this balance. Partners can’t top up themselves."
            aside={
              partner.wallet && (
                <Link href={`/payments/wallets/${partner.wallet}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                  Fund or adjust
                </Link>
              )
            }
          >
            <span className="stat-value text-[28px] leading-none">{wallet ? formatNaira(wallet.balance) : '—'}</span>
          </Panel>

          {/*
            Only the fields the card edits. The partner document also carries the
            legacy encrypted `apiKey`, and handing the whole object to a client
            component would ship that to the browser in the RSC payload.
          */}
          <ApiAccessCard
            partner={{
              _id: partner._id,
              apiEnabled: partner.apiEnabled,
              defaultRequirePin: partner.defaultRequirePin,
              lowBalanceThreshold: partner.lowBalanceThreshold,
            }}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Panel
            flush
            title="API keys"
            description={`${activeKeys.length} active. Secrets are shown once, when the key is issued.`}
            aside={<IssueKeyDialog partnerId={partner._id} />}
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Secret</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last used</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.map((key) => (
                    <TableRow key={key._id}>
                      <TableCell>
                        <div className="font-medium tabular-nums">{key.keyId}</div>
                        <div className="text-[12.5px] text-muted-foreground">{key.label || 'No label'}</div>
                      </TableCell>
                      <TableCell className="text-foreground-secondary tabular-nums">
                        {key.secretLast4 ? `••••${key.secretLast4}` : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={key.status === 'active' ? 'positive' : 'secondary'} dot={key.status === 'active'}>
                          {humanize(key.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-foreground-secondary tabular-nums">
                        {key.lastUsedAt ? formatDate(key.lastUsedAt) : 'Never'}
                      </TableCell>
                      <TableCell className="text-right">
                        {key.status === 'active' && <RevokeKeyButton partnerId={partner._id} keyId={key.keyId} />}
                      </TableCell>
                    </TableRow>
                  ))}
                  {keys.length === 0 && (
                    <EmptyRow colSpan={5} title="No keys issued yet" body="Issue a key so the partner can call the API." />
                  )}
                </TableBody>
              </Table>
            </div>
          </Panel>

          <Panel
            flush
            title="Contacts"
            description="Who to reach about this integration."
            aside={<AddContactDialog partnerId={partner._id} />}
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => {
                    const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ');
                    return (
                      <TableRow key={contact._id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <AvatarInitials name={name || undefined} />
                            <div className="min-w-0">
                              <div className={name ? 'font-medium' : 'font-medium text-muted-foreground'}>
                                {name || 'No name yet'}
                              </div>
                              <div className="truncate text-[12.5px] text-muted-foreground">{contact.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground-secondary tabular-nums">{formatPhone(contact.phone)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{humanize(contact.role)}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={contact.status === 'active' ? 'positive' : 'info'} dot>
                            {humanize(contact.status)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {contacts.length === 0 && (
                    <EmptyRow colSpan={4} title="No contacts yet" body="Add who to reach about this integration." />
                  )}
                </TableBody>
              </Table>
            </div>
          </Panel>
        </div>
      </section>
    </PageStack>
  );
}
