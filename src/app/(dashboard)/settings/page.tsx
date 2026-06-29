import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { ChangePasswordForm } from './_components/change-password-form';

export const metadata = { title: 'Settings — Awarome Admin' };

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const { profile } = session;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">Manage your account preferences.</p>
      </div>

      {/* Profile card */}
      <section className="rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-[14.5px] font-semibold text-foreground">Profile</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2">
          <div className="flex flex-col gap-[5px]">
            <span className="text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">
              First name
            </span>
            <span className="text-[14px] text-foreground">{profile.firstName}</span>
          </div>
          <div className="flex flex-col gap-[5px]">
            <span className="text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">
              Last name
            </span>
            <span className="text-[14px] text-foreground">{profile.lastName}</span>
          </div>
          <div className="flex flex-col gap-[5px]">
            <span className="text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">
              Email
            </span>
            <span className="text-[14px] text-foreground">{profile.email}</span>
          </div>
          <div className="flex flex-col gap-[5px]">
            <span className="text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">
              Role
            </span>
            <span className="text-[14px] capitalize text-foreground">{profile.role}</span>
          </div>
        </div>
      </section>

      {/* Change password card */}
      <section className="rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-[14.5px] font-semibold text-foreground">Change password</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            You&apos;ll need your current password to set a new one.
          </p>
        </div>
        <div className="px-6 py-5">
          <ChangePasswordForm />
        </div>
      </section>
    </div>
  );
}
