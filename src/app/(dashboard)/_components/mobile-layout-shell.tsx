'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Sidebar } from './sidebar';
import { Header } from './header';
import type { NavItem } from '@/lib/nav-items';
import type { StaffProfile } from '@/lib/permissions';

export function MobileLayoutShell({
  profile,
  navItems,
  children,
}: {
  profile: StaffProfile;
  navItems: NavItem[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar — fixed drawer on mobile, static on desktop */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 lg:static lg:flex lg:shrink-0',
          open ? 'flex' : 'hidden lg:flex'
        )}
      >
        <Sidebar
          profile={profile}
          navItems={navItems}
          onClose={() => setOpen(false)}
        />
      </div>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          profile={profile}
          navItems={navItems}
          onMenuClick={() => setOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
