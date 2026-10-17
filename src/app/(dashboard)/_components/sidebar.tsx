'use client';

import Link from 'next/link';
import { Suspense, use, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LogOut, Search, X } from 'lucide-react';
import { logout } from '@/lib/actions';
import { matchNavItem, NavWorkspace, QueueCounts, QueueKey } from '@/lib/nav-items';
import { StaffProfile } from '@/lib/permissions';
import { ROLE_LABELS } from '@/lib/staff-roles';
import { cn } from '@/lib/utils';
import { AwaromeMark } from '@/components/awarome-mark';
import { CommandPalette } from './command-palette';

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

function initials(profile: StaffProfile) {
  return `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase() || '—';
}

export function Sidebar({
  profile,
  workspaces,
  queueCounts,
  onClose,
}: {
  profile: StaffProfile;
  workspaces: NavWorkspace[];
  queueCounts: Promise<QueueCounts>;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const active = matchNavItem(
    workspaces.flatMap((w) => w.items),
    pathname
  );
  const activeWorkspace = workspaces.find((w) => w.items.some((i) => i === active))?.label;

  // Only the active workspace is open by default; opening another closes it.
  // Reset whenever navigation lands in a different workspace.
  const [expanded, setExpanded] = useState({ for: activeWorkspace, open: activeWorkspace });
  const openWorkspace = expanded.for === activeWorkspace ? expanded.open : activeWorkspace;

  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col gap-5 overflow-y-auto bg-nav px-3.5 pt-[22px] pb-4 text-white [scrollbar-width:none]">
      <div className="flex items-center gap-2.5 px-2">
        <AwaromeMark className="h-7 w-[26px] shrink-0" />
        <span className="font-heading text-[21px] leading-none font-extrabold tracking-[-0.04em]">
          awarome
        </span>
        <span className="ml-auto rounded-full border border-[#FFD500]/40 px-2 py-[3px] text-[10.5px] font-semibold tracking-[0.08em] text-[#FFD500] uppercase">
          Admin
        </span>
        {onClose && (
          <button
            onClick={onClose}
            className="flex size-7 shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="flex h-10 shrink-0 items-center gap-2.5 rounded-full bg-white/8 px-3.5 text-[13.5px] text-white/70 transition-colors hover:bg-white/13"
      >
        <Search className="size-4" />
        <span className="whitespace-nowrap">Jump to anything</span>
        <kbd className="ml-auto rounded-[5px] border border-white/18 px-1.5 py-px font-sans text-[11.5px] text-white/50">
          ⌘K
        </kbd>
      </button>
      <CommandPalette workspaces={workspaces} open={paletteOpen} onOpenChange={setPaletteOpen} />

      <nav className="flex flex-col gap-0.5">
        {workspaces.map((workspace) => {
          const isOpen = workspace.label === openWorkspace;
          const queues = workspace.items.flatMap((i) => (i.queue ? [i.queue] : []));
          return (
            <div key={workspace.label} className="flex flex-col">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() =>
                  setExpanded({ for: activeWorkspace, open: isOpen ? undefined : workspace.label })
                }
                className={cn(
                  'flex h-[42px] items-center gap-3 rounded-[8px] px-3 text-left text-[14.5px] whitespace-nowrap transition-colors',
                  isOpen
                    ? 'font-semibold text-white'
                    : 'font-medium text-white/72 hover:bg-white/5 hover:text-white'
                )}
              >
                <NavIcon d={workspace.icon} />
                <span>{workspace.label}</span>
                {!isOpen && queues.length > 0 && (
                  <Suspense fallback={null}>
                    <QueueDot counts={queueCounts} queues={queues} />
                  </Suspense>
                )}
              </button>
              {isOpen && (
                <div className="flex flex-col gap-px pt-0.5 pb-2.5">
                  {workspace.items.map((item) => {
                    const on = item === active;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={on ? 'page' : undefined}
                        className={cn(
                          'relative flex h-9 items-center gap-2.5 rounded-[8px] pr-3 pl-[42px] text-[13.5px] whitespace-nowrap transition-colors',
                          on
                            ? 'bg-white/11 font-medium text-white'
                            : 'text-white/66 hover:bg-white/5 hover:text-white'
                        )}
                      >
                        {on && (
                          <span className="absolute left-6 size-1.5 rounded-full bg-[#FFD500]" />
                        )}
                        <span>{item.label}</span>
                        {item.queue && (
                          <Suspense fallback={null}>
                            <QueueBadge counts={queueCounts} queue={item.queue} />
                          </Suspense>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-2.5 border-t border-white/10 px-2 pt-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#FFD500] text-[13px] font-semibold text-[#120460]">
          {initials(profile)}
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[13.5px] font-medium">
            {profile.firstName} {profile.lastName}
          </span>
          <span className="text-[12px] text-white/60">{ROLE_LABELS[profile.role] ?? profile.role}</span>
        </div>
        <form action={logout} className="ml-auto">
          <button
            type="submit"
            title="Sign out"
            aria-label="Sign out"
            className="flex size-[34px] items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/8 hover:text-white"
          >
            <LogOut className="size-4" />
          </button>
        </form>
      </div>
    </aside>
  );
}

function QueueBadge({ counts, queue }: { counts: Promise<QueueCounts>; queue: QueueKey }) {
  const n = use(counts)[queue];
  if (!n) return null;
  return (
    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FFD500] px-1.5 text-[11.5px] font-semibold text-[#120460] tabular-nums">
      {n > 99 ? '99+' : n}
    </span>
  );
}

function QueueDot({ counts, queues }: { counts: Promise<QueueCounts>; queues: QueueKey[] }) {
  const all = use(counts);
  if (!queues.some((q) => all[q])) return null;
  return <span aria-label="Has pending work" className="ml-auto size-2 rounded-full bg-[#FFD500]" />;
}
