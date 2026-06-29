import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { hasPermission, PermissionAction } from '@/lib/permissions';
import { NAV_ITEMS } from '@/lib/nav-items';
import { MobileLayoutShell } from './_components/mobile-layout-shell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const visibleNavItems = NAV_ITEMS.filter((item) =>
    hasPermission(session.profile, item.module, PermissionAction.VIEW)
  );

  return (
    <MobileLayoutShell profile={session.profile} navItems={visibleNavItems}>
      {children}
    </MobileLayoutShell>
  );
}
