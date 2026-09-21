import Link from 'next/link';
import { authedFetch, ApiError, PaginatedResponse, SingleResponse } from '@/lib/api-client';
import { AdminPartner, AdminPartnerLowBalance } from '@/lib/types';
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
import { formatDate, formatNaira } from '@/lib/format';
import { CreatePartnerDialog } from './_components/create-partner-dialog';

const LIMIT = 20;

async function safeLowBalance(): Promise<AdminPartnerLowBalance[]> {
  try {
    const r = await authedFetch<SingleResponse<AdminPartnerLowBalance[]>>(
      '/admins/partners/low-balance'
    );
    return r.data ?? [];
  } catch {
    return [];
  }
}

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const skip = Number(params.skip ?? 0);

  const query = new URLSearchParams();
  query.set('skip', String(skip));
  query.set('limit', String(LIMIT));

  let result: PaginatedResponse<AdminPartner>;
  let lowBalance: AdminPartnerLowBalance[] = [];

  try {
    [result, lowBalance] = await Promise.all([
      authedFetch<PaginatedResponse<AdminPartner>>(`/admins/partners?${query.toString()}`),
      safeLowBalance(),
    ]);
  } catch (error) {
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Something went wrong.'}
      />
    );
  }

  const liveCount = result.data.filter((p) => p.apiEnabled).length;

  const chips = [
    { label: 'Partners', value: (result.totalCount ?? 0).toLocaleString() },
    { label: 'API enabled', value: liveCount.toLocaleString() },
    { label: 'Running low', value: lowBalance.length.toLocaleString() },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[23px] font-bold tracking-tight text-foreground">API partners</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Third parties booking couriers over the delivery API
          </p>
        </div>
        <CreatePartnerDialog />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {chips.map((chip) => (
          <div
            key={chip.label}
            className="flex flex-col gap-1 rounded-[12px] border border-border bg-card p-[13px_16px] shadow-[var(--shadow-card)]"
          >
            <span className="text-[12px] font-medium text-muted-foreground">{chip.label}</span>
            <span className="text-[20px] font-bold tabular-nums text-foreground">{chip.value}</span>
          </div>
        ))}
      </div>

      {/*
        Partners cannot top themselves up — funding is an ops action. A partner
        that runs dry starts failing every delivery with a 402, so this has to
        be visible here rather than discovered from a support ticket.
      */}
      {lowBalance.length > 0 && (
        <div className="rounded-[14px] border border-border bg-warning-bg p-4">
          <div className="text-[14px] font-semibold text-foreground">
            {lowBalance.length} partner{lowBalance.length === 1 ? '' : 's'} running low on balance
          </div>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Deliveries start failing once the wallet cannot cover the fee. Top up from the
            partner&apos;s wallet.
          </p>
          <ul className="mt-3 flex flex-col gap-1.5">
            {lowBalance.map((p) => (
              <li key={p._id} className="flex flex-wrap items-center gap-2 text-[13px]">
                <Link href={`/partners/${p._id}`} className="font-semibold hover:underline">
                  {p.name || p.email || p._id}
                </Link>
                <span className="tabular-nums text-muted-foreground">
                  {formatNaira(p.balance)} left · alerts below {formatNaira(p.lowBalanceThreshold)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>API</TableHead>
                <TableHead>Handover PIN</TableHead>
                <TableHead>Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.map((partner) => (
                <TableRow key={partner._id}>
                  <TableCell>
                    <Link
                      href={`/partners/${partner._id}`}
                      className="font-medium hover:underline"
                    >
                      {partner.name || '—'}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {partner.email || partner.phone || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={partner.apiEnabled ? 'positive' : 'secondary'}>
                      {partner.apiEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {partner.defaultRequirePin ? 'Required' : 'Not required'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(partner.createdAt).split(',')[0]}
                  </TableCell>
                </TableRow>
              ))}
              {result.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No API partners yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="border-t border-border px-4 py-3">
          <PaginationControls
            skip={skip}
            limit={LIMIT}
            totalCount={result.totalCount}
            basePath="/partners"
            searchParams={params}
          />
        </div>
      </div>
    </div>
  );
}
