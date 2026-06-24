import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function PaginationControls({
  skip,
  limit,
  totalCount,
  basePath,
  searchParams,
}: {
  skip: number;
  limit: number;
  totalCount: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
}) {
  const hasPrev = skip > 0;
  const hasNext = skip + limit < totalCount;

  const buildHref = (newSkip: number) => {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    params.set('skip', String(newSkip));
    return `${basePath}?${params.toString()}`;
  };

  const navClass = (enabled: boolean) =>
    cn(buttonVariants({ variant: 'outline', size: 'sm' }), !enabled && 'pointer-events-none opacity-50');

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted-foreground">
        Showing {totalCount === 0 ? 0 : skip + 1}-
        {Math.min(skip + limit, totalCount)} of {totalCount}
      </p>
      <div className="flex gap-2">
        <Link
          href={buildHref(Math.max(skip - limit, 0))}
          className={navClass(hasPrev)}
          aria-disabled={!hasPrev}
        >
          Previous
        </Link>
        <Link
          href={buildHref(skip + limit)}
          className={navClass(hasNext)}
          aria-disabled={!hasNext}
        >
          Next
        </Link>
      </div>
    </div>
  );
}
