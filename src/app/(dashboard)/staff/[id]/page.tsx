import { notFound, redirect } from 'next/navigation';
import { authedFetch, ApiError, SingleResponse } from '@/lib/api-client';
import { AdminStaff } from '@/lib/types';
import { getSession } from '@/lib/session';
import { PermissionModule, PermissionAction, StaffRole } from '@/lib/permissions';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format';
import { updateStaff, setStaffActive, deleteStaff } from '../actions';

const selectClass =
  'h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

function hasGrant(permissions: string[], mod: PermissionModule, action: PermissionAction) {
  return permissions.includes('*') || permissions.includes(`${mod}:${action}`);
}

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

  async function handleEdit(formData: FormData) {
    'use server';
    const permissions: string[] = [];
    for (const mod of Object.values(PermissionModule)) {
      for (const action of Object.values(PermissionAction)) {
        if (formData.get(`perm_${mod}_${action}`)) {
          permissions.push(`${mod}:${action}`);
        }
      }
    }

    await updateStaff(id, {
      firstName: formData.get('firstName')?.toString(),
      lastName: formData.get('lastName')?.toString(),
      role: formData.get('role')?.toString() as StaffRole,
      permissions,
    });
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
                  action={(suspended) => setStaffActive(staff._id, !suspended)}
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
          <form action={handleEdit} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" name="firstName" defaultValue={staff.firstName} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" name="lastName" defaultValue={staff.lastName} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="role">Role</Label>
                <select id="role" name="role" defaultValue={staff.role} className={selectClass}>
                  {Object.values(StaffRole).map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left font-medium">Module</th>
                    {Object.values(PermissionAction).map((action) => (
                      <th key={action} className="p-2 text-center font-medium capitalize">
                        {action}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.values(PermissionModule).map((mod) => (
                    <tr key={mod} className="border-b last:border-0">
                      <td className="p-2">{mod.replace('_', ' ')}</td>
                      {Object.values(PermissionAction).map((action) => (
                        <td key={action} className="p-2 text-center">
                          <input
                            type="checkbox"
                            name={`perm_${mod}_${action}`}
                            defaultChecked={hasGrant(staff.permissions, mod, action)}
                            className="size-4 rounded border-input"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button type="submit" className="self-start">
              Save changes
            </Button>
          </form>
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
