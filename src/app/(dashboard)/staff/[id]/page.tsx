import { notFound, redirect } from 'next/navigation';
import { authedFetch, ApiError, SingleResponse } from '@/lib/api-client';
import { AdminStaff } from '@/lib/types';
import { getSession } from '@/lib/session';
import { StaffRole } from '@/lib/permissions';
import { ApiErrorCard } from '@/components/api-error-card';
import { AccountStatusControl, StatusPill } from '@/components/account-status';
import { DetailHeader, FactList, PageStack, Panel } from '@/components/page';
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '@/lib/staff-roles';
import { ConfirmActionButton } from '@/components/confirm-action-button';
import { AvatarInitials } from '@/components/avatar-initials';
import { Badge } from '@/components/ui/badge';
import { formatDate, humanize } from '@/lib/format';
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

  const name = [staff.firstName, staff.lastName].filter(Boolean).join(' ');

  return (
    <PageStack>
      <DetailHeader
        back={{ href: '/staff', label: 'All staff' }}
        avatar={<AvatarInitials name={name || undefined} size="lg" />}
        title={
          <>
            {name || 'No name yet'}
            {isSelf && (
              <Badge variant="secondary" className="ml-3 align-middle">
                You
              </Badge>
            )}
          </>
        }
        status={<StatusPill suspended={!staff.isActive} />}
        meta={[ROLE_LABELS[staff.role as StaffRole] ?? humanize(staff.role), staff.email]}
        actions={
          !isSelf && (
            <AccountStatusControl noun="staff member" suspended={!staff.isActive} action={handleSetActive} />
          )
        }
      />

      <section className="grid items-start gap-4 lg:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-4">
          <Panel title="Profile">
            <FactList
              facts={[
                { label: 'Email', value: staff.email },
                { label: 'Role', value: ROLE_LABELS[staff.role as StaffRole] ?? humanize(staff.role) },
                { label: 'What the role covers', value: ROLE_DESCRIPTIONS[staff.role as StaffRole] ?? '—' },
                { label: 'Last sign-in', value: staff.lastLoginAt ? formatDate(staff.lastLoginAt) : 'Never' },
                { label: 'Joined', value: formatDate(staff.createdAt) },
              ]}
            />
          </Panel>

          {!isSelf && (
            <Panel
              title="Delete staff member"
              description="Soft-deletes the account and revokes their access. It stays recoverable in the database."
            >
              <div>
                <ConfirmActionButton
                  label="Delete staff member"
                  title="Delete this staff member?"
                  description="This soft-deletes the account and revokes their access. It stays recoverable in the database."
                  action={handleDelete}
                />
              </div>
            </Panel>
          )}
        </div>

        <Panel
          title="Role and permissions"
          description={
            staff.role === StaffRole.SUPER_ADMIN
              ? 'Super admins have full access regardless of the permission grants below.'
              : 'Grant access per module and action. They can only do what’s checked here.'
          }
        >
          <StaffEditForm staff={staff} />
        </Panel>
      </section>
    </PageStack>
  );
}
