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
import { formatDate, formatNaira } from '@/lib/format';
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/partners" className="text-[13px] text-muted-foreground hover:underline">
            ← API partners
          </Link>
          <h1 className="mt-1 text-[23px] font-bold tracking-tight text-foreground">
            {partner.name || 'Partner'}
          </h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            {[partner.email, partner.phone].filter(Boolean).join(' · ') || '—'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={partner.apiEnabled ? 'positive' : 'secondary'}>
            {partner.apiEnabled ? 'API enabled' : 'API disabled'}
          </Badge>
        </div>
      </div>

      {/*
        Funding is manual, so a partner at zero fails every delivery until ops
        notices. Say so here rather than leaving it to the list page.
      */}
      {lowOnFunds && (
        <div className="rounded-[14px] border border-border bg-warning-bg p-4 text-[13px]">
          <span className="font-semibold text-foreground">Balance is running low.</span>{' '}
          <span className="text-muted-foreground">
            Deliveries fail with a payment error once the wallet cannot cover the fee.
          </span>{' '}
          {partner.wallet && (
            <Link
              href={`/payments/wallets/${partner.wallet}`}
              className="font-semibold text-primary hover:underline"
            >
              Top up now
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="text-[15px] font-semibold text-foreground">Wallet</div>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Every delivery is charged against this balance. Partners cannot top up
            themselves.
          </p>
          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <div className="text-[28px] font-bold tabular-nums text-foreground">
                {wallet ? formatNaira(wallet.balance) : '—'}
              </div>
              <div className="text-[12px] text-muted-foreground">
                {wallet?.lastFundedAt
                  ? `Last funded ${formatDate(wallet.lastFundedAt)}`
                  : 'Never funded'}
              </div>
            </div>
            {partner.wallet && (
              <Link
                href={`/payments/wallets/${partner.wallet}`}
                className="rounded-[9px] border border-border-strong bg-card px-3.5 py-[7px] text-[13px] font-semibold text-foreground-secondary hover:bg-muted"
              >
                Fund / adjust
              </Link>
            )}
          </div>
        </div>

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

      <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <div className="text-[15px] font-semibold text-foreground">API keys</div>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {activeKeys.length} active. Secrets are shown once at issuance and never
              again.
            </p>
          </div>
          <IssueKeyDialog partnerId={partner._id} />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key ID</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Secret</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((key) => (
                <TableRow key={key._id}>
                  <TableCell className="font-mono text-[12px]">{key.keyId}</TableCell>
                  <TableCell className="text-muted-foreground">{key.label || '—'}</TableCell>
                  <TableCell className="font-mono text-[12px] text-muted-foreground">
                    {key.secretLast4 ? `••••${key.secretLast4}` : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={key.status === 'active' ? 'positive' : 'secondary'}>
                      {key.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {key.lastUsedAt ? formatDate(key.lastUsedAt) : 'Never'}
                  </TableCell>
                  <TableCell className="text-right">
                    {key.status === 'active' && (
                      <RevokeKeyButton partnerId={partner._id} keyId={key.keyId} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {keys.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No keys issued yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <div className="text-[15px] font-semibold text-foreground">Contacts</div>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Who to reach about this integration.
            </p>
          </div>
          <AddContactDialog partnerId={partner._id} />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow key={contact._id}>
                  <TableCell className="font-medium">
                    {[contact.firstName, contact.lastName].filter(Boolean).join(' ') || '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{contact.email}</TableCell>
                  <TableCell className="text-muted-foreground">{contact.phone || '—'}</TableCell>
                  <TableCell className="text-muted-foreground capitalize">{contact.role}</TableCell>
                  <TableCell>
                    <Badge variant={contact.status === 'active' ? 'positive' : 'secondary'}>
                      {contact.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {contacts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No contacts yet.
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
