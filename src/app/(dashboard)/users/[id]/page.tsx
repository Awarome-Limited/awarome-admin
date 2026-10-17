import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { authedFetch, ApiError, SingleResponse, PaginatedResponse } from '@/lib/api-client';
import { AdminUser, AdminWallet, AdminOrder, UserAddresses } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { AvatarInitials } from '@/components/avatar-initials';
import { Badge } from '@/components/ui/badge';
import { AccountStatusControl, StatusPill } from '@/components/account-status';
import {
  DetailHeader,
  EmptyRow,
  FactList,
  PageStack,
  Panel,
  RowLink,
  StatCards,
  type StatCardData,
} from '@/components/page';
import { ConfirmActionButton } from '@/components/confirm-action-button';
import { PaginationControls } from '@/components/pagination-controls';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { formatDate, formatNaira, formatPhone, humanize, statusBadgeVariant } from '@/lib/format';
import { setUserSuspended, deleteUser } from '../actions';
import { UserEditForm } from './_components/user-edit-form';

const ORDERS_LIMIT = 10;

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const skip = Number(query.skip ?? 0);

  let user: AdminUser;
  try {
    const result = await authedFetch<SingleResponse<AdminUser>>(`/users/admin/${id}`);
    user = result.data;
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Something went wrong.'}
      />
    );
  }

  // Non-fatal parallel fetches
  let wallet: AdminWallet | null = null;
  let orders: PaginatedResponse<AdminOrder> = { data: [], message: '', skip: 0, limit: ORDERS_LIMIT, totalCount: 0 };
  let userOrderStats: { totalOrders: number; lifetimeSpend: number } | null = null;
  let addresses: UserAddresses | null = null;

  const ordersQ = new URLSearchParams();
  ordersQ.set('user', id);
  ordersQ.set('skip', String(skip));
  ordersQ.set('limit', String(ORDERS_LIMIT));

  const [walletRes, ordersRes, statsRes, addressesRes] = await Promise.allSettled([
    authedFetch<PaginatedResponse<AdminWallet>>(`/admins/wallets?user=${id}&limit=1`),
    authedFetch<PaginatedResponse<AdminOrder>>(`/admins/orders?${ordersQ.toString()}`),
    authedFetch<SingleResponse<{ totalOrders: number; lifetimeSpend: number }>>(`/admins/users/${id}/order-stats`),
    authedFetch<SingleResponse<UserAddresses>>(`/users/admin/${id}/addresses`),
  ]);

  if (walletRes.status === 'fulfilled') wallet = walletRes.value.data?.[0] ?? null;
  if (ordersRes.status === 'fulfilled') orders = ordersRes.value;
  if (statsRes.status === 'fulfilled') userOrderStats = statsRes.value.data ?? null;
  if (addressesRes.status === 'fulfilled') addresses = addressesRes.value.data ?? null;

  async function handleDelete() {
    'use server';
    await deleteUser(id);
    redirect('/users');
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');

  const addrEntries: { label: string; entry: NonNullable<UserAddresses['home']> }[] = [];
  if (addresses?.home) addrEntries.push({ label: 'Home', entry: addresses.home });
  if (addresses?.work) addrEntries.push({ label: 'Work', entry: addresses.work });
  addresses?.others?.forEach((o) => {
    addrEntries.push({ label: o.tag ?? 'Other', entry: o });
  });

  const stats: StatCardData[] = [
    { label: 'Wallet balance', value: wallet ? formatNaira(wallet.balance) : '—' },
    {
      label: 'Total orders',
      value: userOrderStats ? userOrderStats.totalOrders.toLocaleString() : '—',
    },
    {
      label: 'Lifetime spend',
      value: userOrderStats ? `₦ ${userOrderStats.lifetimeSpend.toLocaleString()}` : '—',
    },
    { label: 'Saved addresses', value: addrEntries.length.toLocaleString() },
  ];

  return (
    <PageStack>
      <DetailHeader
        back={{ href: '/users', label: 'All users' }}
        avatar={<AvatarInitials name={fullName || undefined} size="lg" />}
        title={fullName || 'No name yet'}
        status={<StatusPill suspended={!!user.suspended} />}
        meta={[
          user.role && humanize(user.role),
          user.createdAt && `Joined ${formatDate(user.createdAt).split(',')[0]}`,
          !fullName && <Badge variant="warning">Incomplete profile</Badge>,
        ]}
        actions={
          <AccountStatusControl
            noun="user"
            suspended={!!user.suspended}
            action={setUserSuspended.bind(null, user._id)}
          />
        }
      />

      <StatCards stats={stats} />

      <section className="grid items-start gap-4 lg:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-4">
          <Panel title="Profile">
            <FactList
              facts={[
                { label: 'Email', value: user.email || 'No email' },
                { label: 'Phone', value: formatPhone(user.phone) },
                { label: 'Heard via', value: humanize(user.source) },
                { label: 'Joined', value: formatDate(user.createdAt) },
                {
                  label: 'User ID',
                  value: <span className="text-[12.5px] break-all text-foreground-secondary">{user._id}</span>,
                },
              ]}
            />
          </Panel>

          <Panel title="Saved addresses">
            {addrEntries.length === 0 ? (
              <p className="text-[13.5px] text-muted-foreground">No saved addresses yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {addrEntries.map(({ label, entry }, i) => (
                  <div key={i} className="flex flex-col gap-1.5 rounded-[8px] border border-border p-3.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{humanize(label)}</Badge>
                      {entry.isActive && (
                        <Badge variant="positive" dot>
                          In use
                        </Badge>
                      )}
                    </div>
                    <p className="text-[13.5px]">{entry.address || entry.description || '—'}</p>
                    {entry.state && <p className="text-[12.5px] text-muted-foreground">{entry.state}</p>}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Panel
            flush
            title="Recent orders"
            aside={
              <Link
                href={`/orders?user=${id}`}
                className="text-[13.5px] font-medium text-primary hover:text-warning"
              >
                View all orders
              </Link>
            }
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.data.map((order) => (
                    <TableRow key={order._id} className="relative">
                      <TableCell className="tabular-nums">
                        <RowLink href={`/orders/${order._id}`}>
                          {order.orderId ?? order._id.slice(-8).toUpperCase()}
                        </RowLink>
                        <div className="text-[12.5px] text-muted-foreground">{formatDate(order.createdAt)}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={order.isPaid ? 'positive' : 'warning'} dot>
                          {order.isPaid ? 'Paid' : 'Unpaid'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(order.orderDeliveryStatus || order.status)} dot>
                          {humanize(order.orderDeliveryStatus || order.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {order.totalPrice != null ? `₦ ${order.totalPrice.toLocaleString()}` : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {orders.data.length === 0 && (
                    <EmptyRow colSpan={4} title="No orders yet" body="Orders this customer places show up here." />
                  )}
                </TableBody>
              </Table>
            </div>
            {orders.totalCount > ORDERS_LIMIT && (
              <div className="border-t border-border px-6 py-3.5">
                <PaginationControls
                  skip={skip}
                  limit={ORDERS_LIMIT}
                  totalCount={orders.totalCount}
                  basePath={`/users/${id}`}
                  searchParams={query}
                />
              </div>
            )}
          </Panel>

          <UserEditForm user={user} />

          <Panel
            title="Delete user"
            description="Soft-deletes the account. They lose access straight away; the data stays recoverable in the database."
            aside={
              <ConfirmActionButton
                label="Delete user"
                title="Delete this user?"
                description="This soft-deletes the account. The data remains recoverable in the database."
                action={handleDelete}
              />
            }
          >
            {null}
          </Panel>
        </div>
      </section>
    </PageStack>
  );
}
