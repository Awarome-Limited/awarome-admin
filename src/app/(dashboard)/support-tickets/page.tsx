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
import { DropMoney, ResolveTicketDialog } from './_components/resolve-ticket-dialog';

interface Party {
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  name?: string;
  plateNumber?: string;
}

interface TicketDelivery {
  _id: string;
  deliveryId?: string;
  batchId?: string;
  receiver?: { name?: string; phone?: string };
  dropoffAddress?: { address?: string };
  riderStatus?: string;
  status?: string;
  payOnDelivery?: { status?: string; amountDue?: number; amountReceived?: number };
  businessCod?: {
    amountKobo: number;
    feeMode: 'inclusive' | 'added';
    deliveryFeeKobo: number;
    collectKobo: number;
    collectionFeePercent: number;
    collectionFeeCapKobo: number;
    collectMode?: 'transfer' | 'cash';
  };
}

interface TicketOrder {
  _id: string;
  orderId?: string;
  batchId?: string;
  deliveryLocation?: { address?: string };
}

interface Ticket {
  _id: string;
  reference: string;
  type: string;
  status: string;
  jobType: 'order' | 'delivery';
  jobReference?: string;
  atStatus?: string;
  note?: string;
  amountAtRaise?: number;
  resolutionNote?: string;
  appliedCollectKobo?: number;
  createdAt?: string;
  resolvedAt?: string;
  rider?: Party | string;
  business?: Party | string;
  resolvedBy?: Party | string;
  delivery?: TicketDelivery | string;
  order?: TicketOrder | string;
}

interface Payload {
  tickets: Ticket[];
  total: number;
  open: Record<string, number>;
}

const FILTERS = [
  { key: 'open', label: 'Open' },
  { key: 'approved', label: 'Approved' },
  { key: 'declined', label: 'Declined' },
  { key: 'resolved', label: 'Resolved' },
] as const;

const TYPES: Record<string, { label: string; variant: 'warning' | 'info' | 'secondary' }> = {
  'cash-payment': { label: 'Pay in cash', variant: 'warning' },
  'amount-change': { label: 'Amount change', variant: 'warning' },
  'address-issue': { label: "Can't find address", variant: 'info' },
  'package-issue': { label: 'Package problem', variant: 'info' },
  other: { label: 'Other', variant: 'secondary' },
};

const DECISION_TYPES = ['cash-payment', 'amount-change'];

const STAGES: Record<string, string> = {
  accepted: 'Heading to pickup',
  arrived: 'At pickup',
  'picked-up': 'Collected',
  delivering: 'On the way',
  'arrived-dropoff': 'At the drop-off',
};

const naira = (amount?: number | null) =>
  amount == null ? '—' : `₦${amount.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

function partyName(p?: Party | string) {
  if (!p || typeof p === 'string') return '—';
  return [p.firstName, p.lastName].filter(Boolean).join(' ') || p.name || p.email || '—';
}

const populated = <T,>(ref: T | string | undefined): T | null =>
  ref && typeof ref === 'object' ? ref : null;

function dropMoney(delivery: TicketDelivery | null): DropMoney | null {
  const cod = delivery?.businessCod;
  if (!cod) return null;
  return {
    feeMode: cod.feeMode,
    amountKobo: cod.amountKobo,
    deliveryFeeKobo: cod.deliveryFeeKobo,
    collectKobo: cod.collectKobo,
    collectionFeePercent: cod.collectionFeePercent,
    collectionFeeCapKobo: cod.collectionFeeCapKobo,
  };
}

export default async function SupportTicketsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const activeFilter = FILTERS.some((f) => f.key === params.filter)
    ? (params.filter as string)
    : 'open';
  const activeType = params.type && TYPES[params.type] ? params.type : undefined;

  let payload: Payload;
  try {
    const query = new URLSearchParams({ status: activeFilter });
    if (activeType) query.set('type', activeType);
    const res = await authedFetch<SingleResponse<Payload>>(`/admins/support-tickets?${query}`);
    payload = res.data;
  } catch (error) {
    if (error instanceof ApiError) return <ApiErrorCard message={error.message} />;
    throw error;
  }

  const { tickets, open } = payload;
  const isOpen = activeFilter === 'open';
  const hrefFor = (filter: string, type?: string) =>
    `/support-tickets?filter=${filter}${type ? `&type=${type}` : ''}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[23px] font-bold tracking-tight text-foreground">
            Support tickets
          </h1>
          <p className="mt-1 max-w-[70ch] text-[14px] text-muted-foreground">
            Concerns riders raise from a run. Cash and amount-change requests
            hold the drop until you answer, because the rider is waiting at the door.
            Everything is also posted to #support-tickets. Post-pickup
            cancellations have their own{' '}
            <Link href="/cancellations" className="text-primary hover:underline">
              queue
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={hrefFor(f.key, activeType)}
              className={cn(
                'rounded-[9px] border px-3.5 py-[7px] text-[13px] font-semibold transition-colors',
                activeFilter === f.key
                  ? 'border-transparent bg-brand-tint text-primary'
                  : 'border-border-strong bg-card text-foreground-secondary hover:bg-muted'
              )}
            >
              {f.label}
              {f.key === 'open' && Object.values(open).reduce((a, b) => a + b, 0) > 0 && (
                <span className="ml-1.5 tabular-nums">
                  ({Object.values(open).reduce((a, b) => a + b, 0)})
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={hrefFor(activeFilter)}
          className={cn(
            'rounded-full border px-3 py-1 text-[12.5px] font-medium',
            !activeType ? 'border-transparent bg-muted text-foreground' : 'border-border text-muted-foreground hover:bg-muted'
          )}
        >
          All types
        </Link>
        {Object.entries(TYPES).map(([key, t]) => (
          <Link
            key={key}
            href={hrefFor(activeFilter, key)}
            className={cn(
              'rounded-full border px-3 py-1 text-[12.5px] font-medium',
              activeType === key
                ? 'border-transparent bg-muted text-foreground'
                : 'border-border text-muted-foreground hover:bg-muted'
            )}
          >
            {t.label}
            {open[key] ? <span className="ml-1 tabular-nums">· {open[key]}</span> : null}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Rider</TableHead>
                <TableHead>Receiver</TableHead>
                <TableHead>Request</TableHead>
                <TableHead>{isOpen ? 'Raised' : 'Answered'}</TableHead>
                <TableHead className={isOpen ? 'text-right' : undefined}>
                  {isOpen ? 'Decision' : 'Outcome'}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    {isOpen ? 'Nothing waiting. No rider needs an answer.' : 'Nothing here yet.'}
                  </TableCell>
                </TableRow>
              )}
              {tickets.map((ticket) => {
                const type = TYPES[ticket.type] ?? { label: ticket.type, variant: 'secondary' as const };
                const delivery = populated<TicketDelivery>(ticket.delivery);
                const order = populated<TicketOrder>(ticket.order);
                const rider = populated<Party>(ticket.rider);
                const business = populated<Party>(ticket.business);
                const decisionType = DECISION_TYPES.includes(ticket.type);
                const jobId = delivery?._id ?? order?._id;
                const reference =
                  ticket.jobReference || delivery?.deliveryId || order?.orderId || jobId?.slice(-6);

                return (
                  <TableRow key={ticket._id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-[12.5px] font-semibold">
                          {ticket.reference}
                        </span>
                        <Badge variant={type.variant}>{type.label}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        {jobId ? (
                          <Link
                            href={`/${ticket.jobType === 'order' ? 'orders' : 'deliveries'}/${jobId}`}
                            className="font-medium hover:underline"
                          >
                            {reference}
                          </Link>
                        ) : (
                          <span>{reference || '—'}</span>
                        )}
                        <span className="text-[12px] text-muted-foreground">
                          {business ? partyName(business) : ticket.jobType === 'order' ? 'Marketplace' : 'Delivery'}
                          {(delivery?.batchId || order?.batchId) && ` · batch ${delivery?.batchId || order?.batchId}`}
                        </span>
                        <span className="text-[12px] text-muted-foreground">
                          {STAGES[ticket.atStatus || ''] || ticket.atStatus || ''}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span>{partyName(rider ?? undefined)}</span>
                        {rider?.phone && (
                          <a href={`tel:${rider.phone}`} className="text-[12px] text-primary hover:underline">
                            {rider.phone}
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span>{delivery?.receiver?.name || '—'}</span>
                        {delivery?.receiver?.phone && (
                          <a
                            href={`tel:${delivery.receiver.phone}`}
                            className="text-[12px] text-primary hover:underline"
                          >
                            {delivery.receiver.phone}
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-[34ch] flex-col gap-0.5">
                        {ticket.type === 'cash-payment' && (
                          <span className="font-semibold tabular-nums">
                            {naira(ticket.amountAtRaise)} in cash
                          </span>
                        )}
                        {ticket.type === 'amount-change' && (
                          <span className="font-semibold tabular-nums">
                            Collecting {naira(ticket.amountAtRaise)}
                            {isOpen && (
                              <span className="block text-[12px] font-normal text-muted-foreground">
                                Agree the new price with the receiver and the business
                              </span>
                            )}
                          </span>
                        )}
                        {ticket.note && (
                          <span className="text-[12px] text-muted-foreground">“{ticket.note}”</span>
                        )}
                        {!isOpen && ticket.resolutionNote && (
                          <span className="text-[12px] text-muted-foreground">
                            Ops: {ticket.resolutionNote}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(isOpen ? ticket.createdAt : ticket.resolvedAt)}
                      {!isOpen && ticket.resolvedBy && (
                        <div className="text-[12px]">by {partyName(ticket.resolvedBy)}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {isOpen ? (
                        <div className="flex justify-end gap-2">
                          {decisionType ? (
                            <>
                              <ResolveTicketDialog
                                id={ticket._id}
                                reference={ticket.reference}
                                type={ticket.type}
                                decision="decline"
                              />
                              <ResolveTicketDialog
                                id={ticket._id}
                                reference={ticket.reference}
                                type={ticket.type}
                                decision="approve"
                                money={dropMoney(delivery)}
                              />
                            </>
                          ) : (
                            <ResolveTicketDialog
                              id={ticket._id}
                              reference={ticket.reference}
                              type={ticket.type}
                              decision="resolve"
                            />
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <Badge
                            variant={
                              ticket.status === 'declined' ? 'destructive' : 'positive'
                            }
                            dot
                          >
                            {ticket.status}
                          </Badge>
                          {ticket.type === 'amount-change' &&
                            ticket.status === 'approved' &&
                            ticket.appliedCollectKobo != null && (
                              <span className="text-[12px] tabular-nums text-muted-foreground">
                                Now {naira(ticket.appliedCollectKobo / 100)}
                              </span>
                            )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
