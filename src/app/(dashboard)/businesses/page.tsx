import Link from 'next/link';
import { authedFetch, ApiError } from '@/lib/api-client';
import type { AdminBusiness } from '@/lib/types';
import { getSession } from '@/lib/session';
import { hasPermission, PermissionAction, PermissionModule } from '@/lib/permissions';
import { ApiErrorCard } from '@/components/api-error-card';
import { PaginationControls } from '@/components/pagination-controls';
import { SearchBox } from '@/components/search-box';
import { SuspendToggle } from '@/components/suspend-toggle';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { CreateBusinessDialog } from './_components/create-business-dialog';
import { setBusinessSuspended } from './actions';

const LIMIT = 20;
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'suspended', label: 'Suspended' },
];

interface BusinessList {
  data: AdminBusiness[];
  skip: number;
  limit: number;
  totalCount: number;
  stats: { active: number; suspended: number };
}

export default async function BusinessesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const skip = Number(params.skip ?? 0);
  const search = params.search ?? '';
  const filter = params.filter ?? 'all';
  const session = await getSession();
  const canCreate = !!session && hasPermission(session.profile, PermissionModule.BUSINESSES, PermissionAction.CREATE);
  const canUpdate = !!session && hasPermission(session.profile, PermissionModule.BUSINESSES, PermissionAction.UPDATE);

  const query = new URLSearchParams({ skip: String(skip), limit: String(LIMIT) });
  if (search) query.set('search', search);
  if (filter !== 'all') query.set('status', filter);

  let result: BusinessList;
  try {
    result = await authedFetch<BusinessList>(`/admins/businesses?${query.toString()}`);
  } catch (error) {
    return <ApiErrorCard message={error instanceof ApiError ? error.message : 'Something went wrong.'} />;
  }

  const chips = [
    { label: 'Businesses', value: (result.stats.active + result.stats.suspended).toLocaleString() },
    { label: 'Active', value: result.stats.active.toLocaleString() },
    { label: 'Suspended', value: result.stats.suspended.toLocaleString() },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[23px] font-bold tracking-tight text-foreground">Businesses</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Logistics businesses booking pay-on-delivery runs at business.awarome.com
          </p>
        </div>
        {canCreate && <CreateBusinessDialog />}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {chips.map((chip) => (
          <div key={chip.label} className="flex flex-col gap-1 rounded-[12px] border border-border bg-card p-[13px_16px] shadow-[var(--shadow-card)]">
            <span className="text-[12px] font-medium text-muted-foreground">{chip.label}</span>
            <span className="text-[20px] font-bold tabular-nums text-foreground">{chip.value}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => {
            const p = new URLSearchParams();
            if (search) p.set('search', search);
            if (f.key !== 'all') p.set('filter', f.key);
            const href = `/businesses${p.toString() ? `?${p}` : ''}`;
            return (
              <Link
                key={f.key}
                href={href}
                className={cn(
                  'rounded-[9px] border px-3.5 py-[7px] text-[13px] font-semibold transition-colors',
                  filter === f.key
                    ? 'border-transparent bg-brand-tint text-primary'
                    : 'border-border-strong bg-card text-foreground-secondary hover:bg-muted'
                )}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
        <SearchBox placeholder="Search by business name…" />
      </div>

      <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Payout account</TableHead>
                <TableHead className="text-right">Deliveries</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <Link href={`/businesses/${b.id}`} className="flex flex-col gap-0.5">
                      <span className="font-semibold text-foreground hover:underline">{b.name}</span>
                      <span className="text-[12px] text-muted-foreground">{b.pickupAddress?.text}</span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    {b.owner ? (
                      <div className="flex flex-col gap-0.5">
                        <span>{b.owner.name || b.owner.email}</span>
                        <span className="text-[12px] text-muted-foreground">
                          {b.owner.status === 'invited' ? 'Invite pending' : b.owner.email}
                        </span>
                      </div>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    {b.payoutAccount ? (
                      `${b.payoutAccount.bankName} ••${b.payoutAccount.last4}`
                    ) : (
                      <Badge variant="warning">Not set</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{(b.deliveries ?? 0).toLocaleString()}</TableCell>
                  <TableCell>
                    {canUpdate ? (
                      <SuspendToggle suspended={b.status === 'suspended'} action={setBusinessSuspended.bind(null, b.id)} />
                    ) : (
                      <Badge variant={b.status === 'active' ? 'positive' : 'secondary'}>{b.status}</Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(b.createdAt)}</TableCell>
                </TableRow>
              ))}
              {result.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No businesses yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <PaginationControls skip={skip} limit={LIMIT} totalCount={result.totalCount} basePath="/businesses" searchParams={params} />
    </div>
  );
}
