'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Clock, Menu } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { matchNavItem, NavWorkspace } from '@/lib/nav-items';

const lagosClock = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Lagos',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** "Sat 17 Oct, 12:41". Every time in the admin is Lagos time; this chip says so once. */
function useLagosNow() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => {
      const parts = Object.fromEntries(
        lagosClock.formatToParts(new Date()).map((p) => [p.type, p.value])
      );
      setNow(`${parts.weekday} ${parts.day} ${parts.month}, ${parts.hour}:${parts.minute}`);
    };
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function Header({
  workspaces,
  onMenuClick,
}: {
  workspaces: NavWorkspace[];
  onMenuClick?: () => void;
}) {
  const pathname = usePathname();
  const now = useLagosNow();
  const page = matchNavItem(
    workspaces.flatMap((w) => w.items),
    pathname
  );
  const workspace = workspaces.find((w) => w.items.includes(page!))?.label;

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background px-4 lg:px-10">
      <button
        onClick={onMenuClick}
        className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      <div className="flex min-w-0 items-center gap-2 text-[14px] text-muted-foreground">
        {workspace && (
          <>
            <span className="hidden sm:inline">{workspace}</span>
            <span className="hidden sm:inline">/</span>
          </>
        )}
        <span className="truncate font-medium text-foreground">{page?.label ?? ''}</span>
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        {now && (
          <span className="hidden h-[34px] items-center gap-2 rounded-full bg-muted px-3.5 text-[12.5px] whitespace-nowrap text-foreground-secondary tabular-nums sm:inline-flex">
            <Clock className="size-3.5" />
            Lagos · {now}
          </span>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
