'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { AvatarInitials } from '@/components/avatar-initials';
import { NavItem } from '@/lib/nav-items';
import { StaffProfile } from '@/lib/permissions';

export function Header({
  profile,
  navItems,
}: {
  profile: StaffProfile;
  navItems: NavItem[];
}) {
  const pathname = usePathname();
  const current = navItems
    .filter((item) => pathname === item.href || pathname.startsWith(item.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0];
  const title = pathname === '/' ? 'Dashboard' : current?.label ?? '';

  return (
    <header className="flex h-[62px] shrink-0 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-[9px] text-[13.5px]">
        <span className="text-muted-foreground">Awarome</span>
        <span className="text-muted-foreground">/</span>
        <span className="font-semibold text-foreground">{title}</span>
      </div>
      <div className="flex items-center gap-2.5">
        <ThemeToggle />
        <div className="h-6 w-px bg-border" />
        <Link href="/profile">
          <AvatarInitials name={`${profile.firstName} ${profile.lastName}`} size="sm" />
        </Link>
      </div>
    </header>
  );
}
