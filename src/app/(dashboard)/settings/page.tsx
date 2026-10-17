import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { ChangePasswordForm } from './_components/change-password-form';
import { AvatarInitials } from '@/components/avatar-initials';
import { FactList, PageHeader, PageStack, Panel } from '@/components/page';
import { ROLE_LABELS } from '@/lib/staff-roles';

export const metadata = { title: 'Settings · Awarome Admin' };

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const { profile } = session;

  return (
    <PageStack>
      <PageHeader title="Settings" subtitle="Your staff account and password." />

      <section className="grid items-start gap-4 lg:grid-cols-[minmax(260px,1fr)_minmax(0,1.4fr)]">
        <Panel title="Profile" description="Ask a super admin to change your name or role.">
          <div className="flex items-center gap-3">
            <AvatarInitials name={`${profile.firstName} ${profile.lastName}`} />
            <div className="min-w-0">
              <div className="font-medium">
                {profile.firstName} {profile.lastName}
              </div>
              <div className="truncate text-[12.5px] text-muted-foreground">{profile.email}</div>
            </div>
          </div>
          <FactList
            facts={[
              { label: 'Email', value: profile.email },
              { label: 'Role', value: ROLE_LABELS[profile.role] ?? profile.role },
            ]}
          />
        </Panel>

        <Panel title="Change password" description="You’ll need your current password to set a new one.">
          <ChangePasswordForm />
        </Panel>
      </section>
    </PageStack>
  );
}
