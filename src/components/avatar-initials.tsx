import { cn } from '@/lib/utils';

function getInitials(name: string) {
  return name
    .replace(/[()]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

export function AvatarInitials({
  name,
  className,
  size = 'default',
  shape = 'person',
}: {
  name?: string;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  /** People are indigo circles; stores and businesses are orange rounded squares. */
  shape?: 'person' | 'store';
}) {
  const sizeClass =
    size === 'sm' ? 'size-[32px] text-[12px]' : size === 'lg' ? 'size-[72px] text-[22px]' : 'size-[38px] text-[13px]';

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center font-semibold',
        shape === 'store' ? (size === 'lg' ? 'rounded-[14px]' : 'rounded-[8px]') : 'rounded-full',
        // Detail-page identity avatars are the yellow brand moment; list avatars stay quiet.
        size === 'lg'
          ? 'bg-hi text-[#120460]'
          : shape === 'store'
            ? 'bg-warning-bg text-warning'
            : 'bg-brand-tint text-primary',
        sizeClass,
        className
      )}
    >
      {name ? getInitials(name) : '—'}
    </div>
  );
}
