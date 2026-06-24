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
}: {
  name?: string;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}) {
  const sizeClass =
    size === 'sm' ? 'size-[30px] text-[11px]' : size === 'lg' ? 'size-12 text-base' : 'size-[34px] text-xs';

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-brand-tint font-bold text-primary',
        sizeClass,
        className
      )}
    >
      {name ? getInitials(name) : '—'}
    </div>
  );
}
