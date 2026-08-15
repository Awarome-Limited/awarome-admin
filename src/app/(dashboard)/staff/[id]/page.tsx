import { notFound, redirect } from 'next/navigation';
import { authedFetch, ApiError, SingleResponse } from '@/lib/api-client';
import { AdminStaff } from '@/lib/types';
import { getSession } from '@/lib/session';
import { StaffRole } from '@/lib/permissions';
import { ApiErrorCard } from '@/components/api-error-card';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DetailRow } from '@/components/detail-row';
import { SuspendToggle } from '@/components/suspend-toggle';
import { ConfirmActionButton } from '@/components/confirm-action-button';
import { AvatarInitials } from '@/components/avatar-initials';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';
import { setStaffActive, deleteStaff } from '../actions';
import { StaffEditForm } from './_components/staff-edit-form';

export default async function StaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const isSelf = session?.profile.id === id;

  let staff: AdminStaff;
  try {
    const result = await authedFetch<SingleResponse<AdminStaff>>(
      `/admins/staff/${id}`
    );
    staff = result.data;
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

  async function handleSetActive(suspended: boolean) {
    'use server';
    await setStaffActive(staff._id, !suspended);
  }

  async function handleDelete() {
    'use server';
    await deleteStaff(id);
    redirect('/staff');
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-3.5">
        <AvatarInitials name={`${staff.firstName} ${staff.lastName}`} size="lg" />
        <h1 className="text-[22px] font-bold tracking-tight">
          {staff.firstName} {staff.lastName}
          {isSelf && (
            <Badge variant="secondary" className="ml-2 align-middle">
              you
            </Badge>
          )}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <DetailRow label="Email" value={staff.email} />
          <DetailRow label="Role" value={<Badge variant="outline">{staff.role}</Badge>} />
          <DetailRow label="Last login" value={formatDate(staff.lastLoginAt)} />
          <DetailRow label="Joined" value={formatDate(staff.createdAt)} />
          <DetailRow
            label="Status"
            value={
              isSelf ? (
                <span className="text-muted-foreground">Active</span>
              ) : (
                <SuspendToggle
                  suspended={!staff.isActive}
                  action={handleSetActive}
                />
              )
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Edit staff member</CardTitle>
          <CardDescription>
            {staff.role === StaffRole.SUPER_ADMIN
              ? 'Super admins have full access regardless of the permission grants below.'
              : "Grant access per module and action. The staff member can only do what's checked here."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StaffEditForm staff={staff} />
        </CardContent>
      </Card>

      {!isSelf && (
        <div>
          <ConfirmActionButton
            label="Delete staff member"
            title="Delete this staff member?"
            description="This soft-deletes the account and revokes their access. It stays recoverable in the database."
            action={handleDelete}
          />
        </div>
      )}
    </div>
  );
}
