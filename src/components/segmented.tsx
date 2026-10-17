import Link from 'next/link';
import { cn } from '@/lib/utils';
import { LinkPending } from '@/components/link-pending';

/**
 * Segmented control (DESIGN.md "Segmented tabs"): a sunk pill track whose
 * active segment is a raised card. Classes are exported for client controls
 * that switch state with buttons instead of links.
 */
export const segmentTrack = 'flex w-fit flex-wrap gap-0.5 rounded-full bg-muted p-[3px]';

export function segmentItem(active: boolean, size: 'default' | 'sm' = 'default') {
  return cn(
    'inline-flex items-center gap-2 rounded-full whitespace-nowrap transition-colors',
    size === 'sm' ? 'h-8 px-3.5 text-[13px]' : 'h-[34px] px-3.5 text-[13.5px]',
    active
      ? 'bg-card font-medium text-foreground shadow-[var(--shadow-float)] dark:bg-card'
      : 'text-foreground-secondary hover:text-foreground'
  );
}

export interface SegmentedLink {
  key: string;
  label: string;
  href: string;
  /** Shown muted next to the label on tabs that filter a list. */
  count?: number | string;
}

export function SegmentedLinks({
  items,
  active,
  className,
}: {
  items: SegmentedLink[];
  active: string;
  className?: string;
}) {
  return (
    <nav className={cn(segmentTrack, className)}>
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={item.key === active ? 'page' : undefined}
          className={cn(segmentItem(item.key === active), 'relative')}
        >
          {item.label}
          {item.count !== undefined && (
            <span className="text-[12px] text-muted-foreground tabular-nums">{item.count}</span>
          )}
          <LinkPending className="text-muted-foreground" />
        </Link>
      ))}
    </nav>
  );
}
