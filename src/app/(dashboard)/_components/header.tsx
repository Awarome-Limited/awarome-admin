'use client';

import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { AvatarInitials } from '@/components/avatar-initials';
import { NavItem } from '@/lib/nav-items';
import { StaffProfile } from '@/lib/permissions';

export function Header({
  profile,
  navItems,
  onMenuClick,
}: {
  profile: StaffProfile;
  navItems: NavItem[];
  onMenuClick?: () => void;
}) {
  const pathname = usePathname();
  const current = navItems
    .filter((item) => pathname === item.href || pathname.startsWith(item.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0];
  const title = pathname === '/' ? 'Dashboard' : current?.label ?? '';

  return (
    <header className="flex h-[62px] shrink-0 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="flex lg:hidden h-8 w-8 items-center justify-center rounded-[8px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>

        <div className="flex items-center gap-[9px] text-[13.5px]">
          <span className="hidden text-muted-foreground sm:inline">Awarome</span>
          <span className="hidden text-muted-foreground sm:inline">/</span>
          <span className="font-semibold text-foreground">{title}</span>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <ThemeToggle />
        <div className="h-6 w-px bg-border" />
        <AvatarInitials name={`${profile.firstName} ${profile.lastName}`} size="sm" />
      </div>
    </header>
  );
}
