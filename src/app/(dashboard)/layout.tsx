import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { hasPermission, PermissionAction } from '@/lib/permissions';
import { NAV_WORKSPACES } from '@/lib/nav-items';
import { getQueueCounts } from '@/lib/queues';
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

  const workspaces = NAV_WORKSPACES.map((workspace) => ({
    ...workspace,
    items: workspace.items.filter(
      (item) => !item.module || hasPermission(session.profile, item.module, PermissionAction.VIEW)
    ),
  })).filter((workspace) => workspace.items.length > 0);

  // Not awaited: the badges stream in, so a slow queue never holds up the page.
  const queueCounts = getQueueCounts(session.profile);

  return (
    <MobileLayoutShell profile={session.profile} workspaces={workspaces} queueCounts={queueCounts}>
      {children}
    </MobileLayoutShell>
  );
}
