import { notFound, redirect } from 'next/navigation';
import { authedFetch, ApiError, SingleResponse } from '@/lib/api-client';
import { AdminUser } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DetailRow } from '@/components/detail-row';
import { SuspendToggle } from '@/components/suspend-toggle';
import { ConfirmActionButton } from '@/components/confirm-action-button';
import { AvatarInitials } from '@/components/avatar-initials';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';
import { setUserSuspended, deleteUser } from '../actions';

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let user: AdminUser;
  try {
    const result = await authedFetch<SingleResponse<AdminUser>>(
      `/users/admin/${id}`
    );
    user = result.data;
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) {
      notFound();
    }
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Something went wrong.'}
      />
    );
  }

  async function handleDelete() {
    'use server';
    await deleteUser(id);
    redirect('/users');
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-3.5">
        <AvatarInitials name={`${user.firstName ?? ''} ${user.lastName ?? ''}`} size="lg" />
        <h1 className="text-[22px] font-bold tracking-tight">
          {user.firstName} {user.lastName}
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <DetailRow label="Email" value={user.email} />
          <DetailRow label="Phone" value={user.phone} />
          <DetailRow label="Role" value={<Badge variant="outline">{user.role}</Badge>} />
          <DetailRow label="State" value={user.state} />
          <DetailRow label="Joined" value={formatDate(user.createdAt)} />
          <DetailRow
            label="Status"
            value={
              <SuspendToggle
                suspended={!!user.suspended}
                action={setUserSuspended.bind(null, user._id)}
              />
            }
          />
        </CardContent>
      </Card>
      <div>
        <ConfirmActionButton
          label="Delete user"
          title="Delete this user?"
          description="This soft-deletes the account. It stays recoverable in the database."
          action={handleDelete}
        />
      </div>
    </div>
  );
}
