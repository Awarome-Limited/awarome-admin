'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const dateFrom = searchParams.get('dateFrom') ?? '';
  const dateTo = searchParams.get('dateTo') ?? '';

  function update(key: 'dateFrom' | 'dateTo', value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete('skip');
    router.push(`${pathname}?${params.toString()}`);
  }

  function clear() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('dateFrom');
    params.delete('dateTo');
    params.delete('skip');
    router.push(`${pathname}?${params.toString()}`);
  }

  const inputClass =
    'w-full sm:w-auto h-8 rounded-[9px] border border-input bg-card px-2.5 text-[13px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[13px] font-medium text-muted-foreground">Joined</span>
      <input
        type="date"
        value={dateFrom}
        max={dateTo || undefined}
        onChange={(e) => update('dateFrom', e.target.value)}
        className={inputClass}
      />
      <span className="text-[13px] text-muted-foreground">–</span>
      <input
        type="date"
        value={dateTo}
        min={dateFrom || undefined}
        onChange={(e) => update('dateTo', e.target.value)}
        className={inputClass}
      />
      {(dateFrom || dateTo) && (
        <button
          onClick={clear}
          className="text-[12px] text-muted-foreground hover:text-foreground"
        >
          Clear
        </button>
      )}
    </div>
  );
}
