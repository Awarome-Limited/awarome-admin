import Link from 'next/link';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'send', label: 'Send now', href: '/push-notifications' },
  { key: 'scheduled', label: 'Scheduled', href: '/push-notifications/scheduled' },
] as const;

export function PushTabs({ active }: { active: (typeof TABS)[number]['key'] }) {
  return (
    <nav aria-label="Push notifications" className="flex gap-1 border-b border-border">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={active === tab.key ? 'page' : undefined}
          className={cn(
            '-mb-px border-b-2 px-3.5 py-2 text-[13.5px] font-semibold transition-colors',
            active === tab.key
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
