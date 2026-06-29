import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { authedFetch, ApiError, SingleResponse, PaginatedResponse } from '@/lib/api-client';
import { AdminUser, AdminWallet, AdminOrder, UserAddresses } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { AvatarInitials } from '@/components/avatar-initials';
import { Badge } from '@/components/ui/badge';
import { SuspendToggle } from '@/components/suspend-toggle';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { formatDate, formatNaira, statusBadgeVariant } from '@/lib/format';
import { setUserSuspended, deleteUser, updateUser } from '../actions';

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

  async function handleEdit(formData: FormData) {
    'use server';
    await updateUser(id, {
      firstName: formData.get('firstName')?.toString(),
      lastName: formData.get('lastName')?.toString(),
      phone: formData.get('phone')?.toString(),
      source: formData.get('source')?.toString(),
    });
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || '—';

  const addrEntries: { label: string; entry: NonNullable<UserAddresses['home']> }[] = [];
  if (addresses?.home) addrEntries.push({ label: 'Home', entry: addresses.home });
  if (addresses?.work) addrEntries.push({ label: 'Work', entry: addresses.work });
  addresses?.others?.forEach((o) => {
    addrEntries.push({ label: o.tag ?? 'Other', entry: o });
  });

  const statCards = [
    { label: 'Wallet balance', value: wallet ? formatNaira(wallet.balance) : '—' },
    { label: 'Total orders', value: userOrderStats ? userOrderStats.totalOrders.toLocaleString() : '—' },
    { label: 'Lifetime spend', value: userOrderStats ? `₦${userOrderStats.lifetimeSpend.toLocaleString()}` : '—' },
    { label: 'Saved addresses', value: addrEntries.length.toLocaleString() },
  ];

  const infoFields = [
    { label: 'Email', value: user.email || '—' },
    { label: 'Phone', value: user.phone || '—' },
    { label: 'Source', value: user.source || '—' },
    { label: 'User ID', value: user._id, mono: true },
    { label: 'Joined', value: formatDate(user.createdAt) },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Back */}
      <Link
        href="/users"
        className="inline-flex w-fit items-center gap-1.5 rounded-[9px] border border-border-strong bg-card px-3 py-1.5 text-[13px] font-semibold text-foreground-secondary hover:bg-muted"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to users
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <AvatarInitials name={fullName} size="lg" />
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-foreground">{fullName}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge variant={user.suspended ? 'destructive' : 'positive'} dot>
                {user.suspended ? 'Suspended' : 'Active'}
              </Badge>
              {user.role && (
                <Badge variant={statusBadgeVariant(user.role)}>{user.role}</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SuspendToggle
            suspended={!!user.suspended}
            action={setUserSuspended.bind(null, user._id)}
          />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="flex flex-col gap-1.5 rounded-[14px] border border-border bg-card p-[16px_18px] shadow-[var(--shadow-card)]"
          >
            <span className="text-[12.5px] font-medium text-muted-foreground">{s.label}</span>
            <span className="text-[23px] font-bold tabular-nums tracking-tight text-primary">
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* Two-column body */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Left column */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* Account information */}
          <div className="rounded-[14px] border border-border bg-card p-[20px_22px] shadow-[var(--shadow-card)]">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[15px] font-semibold text-foreground">Account information</span>
              <a
                href="#edit-user"
                className="text-[12.5px] font-semibold text-primary hover:underline"
              >
                Edit
              </a>
            </div>
            <div className="grid gap-x-[26px] gap-y-[18px] [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
              {infoFields.map((f) => (
                <div key={f.label} className="flex flex-col gap-1">
                  <span className="text-[12px] font-medium text-muted-foreground">{f.label}</span>
                  {f.mono ? (
                    <span className="break-all font-mono text-[11px] text-foreground-secondary">
                      {f.value}
                    </span>
                  ) : (
                    <span className="text-[14px] font-medium text-foreground">{f.value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Edit user */}
          <div
            id="edit-user"
            className="rounded-[14px] border border-border bg-card p-[20px_22px] shadow-[var(--shadow-card)]"
          >
            <div className="mb-4 text-[15px] font-semibold text-foreground">Edit user</div>
            <form action={handleEdit} className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First name" name="firstName" defaultValue={user.firstName} />
                <Field label="Last name" name="lastName" defaultValue={user.lastName} />
                <Field label="Phone" name="phone" defaultValue={user.phone} />
                <Field label="Source" name="source" defaultValue={user.source} />
              </div>
              <div>
                <Button type="submit">Save changes</Button>
              </div>
            </form>
          </div>

          {/* Order history */}
          <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between px-5 pb-3 pt-[18px]">
              <span className="text-[15px] font-semibold text-foreground">
                Order history
                {orders.totalCount > 0 && (
                  <span className="ml-2 text-[13px] font-normal text-muted-foreground">
                    ({orders.totalCount.toLocaleString()})
                  </span>
                )}
              </span>
              <Link
                href={`/orders?user=${id}`}
                className="text-[12.5px] font-semibold text-primary hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.data.map((order) => (
                    <TableRow key={order._id}>
                      <TableCell>
                        <Link
                          href={`/orders/${order._id}`}
                          className="rounded bg-chip px-2 py-0.5 font-mono text-xs hover:underline"
                        >
                          {order.orderId ?? order._id.slice(-8).toUpperCase()}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(order.status)} dot>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(order.orderDeliveryStatus)} dot>
                          {order.orderDeliveryStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={order.isPaid ? 'positive' : 'warning'} dot>
                          {order.isPaid ? 'Paid' : 'Unpaid'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {order.totalPrice != null ? `₦${order.totalPrice.toLocaleString()}` : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(order.createdAt).split(',')[0]}
                      </TableCell>
                    </TableRow>
                  ))}
                  {orders.data.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        No orders yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="border-t border-border px-4 py-3">
              <PaginationControls
                skip={skip}
                limit={ORDERS_LIMIT}
                totalCount={orders.totalCount}
                basePath={`/users/${id}`}
                searchParams={query}
              />
            </div>
          </div>

          {/* Delete user */}
          <div className="rounded-[14px] border border-destructive/30 bg-card p-[20px_22px] shadow-[var(--shadow-card)]">
            <div className="mb-1 text-[15px] font-semibold text-destructive">Delete user</div>
            <p className="mb-4 text-[13px] text-muted-foreground">
              Soft-deletes this account. The data stays recoverable in the database but the user loses access immediately.
            </p>
            <ConfirmActionButton
              label="Delete user"
              title="Delete this user?"
              description="This soft-deletes the account. The data remains recoverable in the database."
              action={handleDelete}
            />
          </div>
        </div>

        {/* Right column — Saved addresses */}
        <div className="lg:w-[300px] lg:flex-none">
          <div className="rounded-[14px] border border-border bg-card p-[20px_22px] shadow-[var(--shadow-card)]">
            <div className="mb-4 text-[15px] font-semibold text-foreground">
              Saved addresses
            </div>
            {addrEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <svg
                  className="mb-3 text-muted-foreground/40"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <p className="text-[13px] text-muted-foreground">No saved addresses yet</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {addrEntries.map(({ label, entry }, i) => (
                  <div
                    key={i}
                    className="rounded-[10px] border border-border bg-muted/30 p-[12px_14px]"
                  >
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="rounded bg-chip px-2 py-0.5 text-[11px] font-semibold capitalize text-foreground-secondary">
                        {label}
                      </span>
                      {entry.isActive && (
                        <Badge variant="positive" className="text-[10px]">
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-[13px] text-foreground">
                      {entry.address || entry.description || '—'}
                    </p>
                    {entry.state && (
                      <p className="mt-0.5 text-[12px] text-muted-foreground">{entry.state}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className ?? ''}`}>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} />
    </div>
  );
}
