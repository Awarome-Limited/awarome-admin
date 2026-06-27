'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { logout } from '@/lib/actions';
import { AvatarInitials } from '@/components/avatar-initials';
import { NavItem, NAV_ICONS, DASHBOARD_ICON } from '@/lib/nav-items';
import { StaffProfile } from '@/lib/permissions';
import { cn } from '@/lib/utils';

function NavIcon({ d }: { d: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <path d={d} />
    </svg>
  );
}

export function Sidebar({
  profile,
  navItems,
}: {
  profile: StaffProfile;
  navItems: NavItem[];
}) {
  const pathname = usePathname();

  // Only highlight the most-specific matching item (longest href wins).
  const activeHref = navItems
    .filter((item) => pathname === item.href || pathname.startsWith(item.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <aside className="flex w-[248px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-[11px] px-[18px] pt-5 pb-3.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Awarome" width={36} height={36} className="shrink-0 rounded-[10px]" />
        <div className="flex flex-col gap-px">
          <span className="text-[15px] font-bold tracking-tight text-sidebar-foreground">
            Awarome
          </span>
          <span className="text-[11px] font-medium text-muted-foreground">
            Admin console
          </span>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-1.5">
        <NavLink href="/" label="Dashboard" icon={DASHBOARD_ICON} active={pathname === '/'} />
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={NAV_ICONS[item.module]}
            active={item.href === activeHref}
          />
        ))}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2.5 px-1.5 py-2">
          <AvatarInitials name={`${profile.firstName} ${profile.lastName}`} size="sm" />
          <div className="flex min-w-0 flex-col gap-px">
            <span className="truncate text-[13px] font-semibold text-sidebar-foreground">
              {profile.firstName} {profile.lastName}
            </span>
            <span className="text-[11px] text-muted-foreground">{profile.role}</span>
          </div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="mt-1.5 flex w-full items-center justify-center gap-[7px] rounded-[9px] border border-border-strong bg-transparent py-2 text-[13px] font-medium text-foreground-secondary transition-colors hover:bg-secondary"
          >
            <LogOut className="size-[15px]" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

function NavLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-[11px] rounded-[9px] px-[11px] py-[9px] text-[13.5px] transition-colors',
        active
          ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground'
          : 'font-medium text-muted-foreground hover:bg-secondary hover:text-foreground'
      )}
    >
      <NavIcon d={icon} />
      <span>{label}</span>
    </Link>
  );
}
