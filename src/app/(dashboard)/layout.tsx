import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { hasPermission, PermissionAction } from '@/lib/permissions';
import { NAV_ITEMS } from '@/lib/nav-items';
import { Sidebar } from './_components/sidebar';
import { Header } from './_components/header';

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
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar profile={session.profile} navItems={visibleNavItems} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header profile={session.profile} navItems={visibleNavItems} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
