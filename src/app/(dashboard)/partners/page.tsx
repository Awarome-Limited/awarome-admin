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
import { formatDate, formatNaira, formatPhone } from '@/lib/format';
import { CreatePartnerDialog } from './_components/create-partner-dialog';
import { StatStrip } from '@/components/stat-strip';
import { AvatarInitials } from '@/components/avatar-initials';
import {
  EmptyRow,
  InlineNotice,
  ListCard,
  PageHeader,
  PageStack,
  RowChevron,
  RowLink,
} from '@/components/page';

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
    <PageStack>
      <PageHeader
        title="API partners"
        subtitle="Third parties booking couriers over the delivery API."
        actions={<CreatePartnerDialog />}
      />

      <StatStrip stats={chips} />

      {/*
        Partners cannot top themselves up — funding is an ops action. A partner
        that runs dry starts failing every delivery with a 402, so this has to
        be visible here rather than discovered from a support ticket.
      */}
      {lowBalance.map((p) => (
        <InlineNotice
          key={p._id}
          action={<Link href={`/partners/${p._id}`}>Top up</Link>}
        >
          <strong className="font-semibold">{p.name || p.email || p._id}</strong> has{' '}
          {formatNaira(p.balance)} left (alerts below {formatNaira(p.lowBalanceThreshold)}). Deliveries start
          failing once the wallet can’t cover the fee.
        </InlineNotice>
      ))}

      <ListCard
        footer={
          <PaginationControls
            skip={skip}
            limit={LIMIT}
            totalCount={result.totalCount}
            basePath="/partners"
            searchParams={params}
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Partner</TableHead>
              <TableHead>API access</TableHead>
              <TableHead>Handover PIN</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.data.map((partner) => (
              <TableRow key={partner._id} className="relative">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <AvatarInitials name={partner.name || undefined} shape="store" />
                    <div className="min-w-0">
                      <RowLink href={`/partners/${partner._id}`}>{partner.name || 'No name yet'}</RowLink>
                      <div className="truncate text-[12.5px] text-muted-foreground tabular-nums">
                        {partner.email || (partner.phone && formatPhone(partner.phone)) || 'No contact'}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={partner.apiEnabled ? 'positive' : 'secondary'} dot={partner.apiEnabled}>
                    {partner.apiEnabled ? 'Enabled' : 'Off'}
                  </Badge>
                </TableCell>
                <TableCell className="text-foreground-secondary">
                  {partner.defaultRequirePin ? 'Required' : 'Not required'}
                </TableCell>
                <TableCell className="whitespace-nowrap text-foreground-secondary tabular-nums">
                  {formatDate(partner.createdAt).split(',')[0]}
                </TableCell>
                <TableCell>
                  <RowChevron />
                </TableCell>
              </TableRow>
            ))}
            {result.data.length === 0 && (
              <EmptyRow
                colSpan={5}
                title="No API partners yet"
                body="Add a partner, then issue them an API key from their page."
              />
            )}
          </TableBody>
        </Table>
      </ListCard>
    </PageStack>
  );
}
