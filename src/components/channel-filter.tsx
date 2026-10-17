'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CHANNEL_LABELS } from '@/lib/types';
import { startNavigationProgress } from '@/components/navigation-progress';

/**
 * Narrows a list to one surface. Preserves every other query param so it
 * composes with the status pills and the search box rather than resetting
 * them.
 */
export function ChannelFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const value = searchParams.get('channel') ?? '';

  function onChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set('channel', next);
    else params.delete('channel');
    // A new filter means a new result set — page 1.
    params.delete('skip');
    const query = params.toString();
    startNavigationProgress();
    router.push(`${pathname}${query ? `?${query}` : ''}`);
  }

  return (
    <select
      aria-label="Filter by channel"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="toolbar-select"
    >
      <option value="">All channels</option>
      {Object.entries(CHANNEL_LABELS).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );
}
