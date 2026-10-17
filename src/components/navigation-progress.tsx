'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const START_EVENT = 'awarome:navigation-start';

/**
 * Call before a programmatic `router.push/replace` (search boxes, filter
 * selects) so the progress bar shows for navigations no link click starts.
 */
export function startNavigationProgress() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(START_EVENT));
}

/**
 * A thin indigo bar at the top of the window while any navigation is in
 * flight — including same-page ones (tabs, filters, search, pagination),
 * which change only the query string and so never show a route skeleton.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const url = search ? `${pathname}?${search}` : pathname;
  const [visible, setVisible] = useState(false);
  const prevUrl = useRef(url);

  // Hide once the new URL has rendered.
  useEffect(() => {
    if (prevUrl.current !== url) {
      prevUrl.current = url;
      setVisible(false);
    }
  }, [url]);

  // Never leave the bar stuck if a navigation is abandoned.
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), 15000);
    return () => clearTimeout(timer);
  }, [visible]);

  useEffect(() => {
    const show = () => setVisible(true);

    const handleClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element).closest('a[href]');
      if (!anchor || anchor.getAttribute('target') === '_blank' || anchor.hasAttribute('download')) return;

      const href = anchor.getAttribute('href') ?? '';
      if (/^(https?:|\/\/|#|mailto:|tel:)/.test(href)) return;

      const target = new URL(href, window.location.href);
      if (target.origin !== window.location.origin) return;
      const next = target.pathname + target.search;
      const current = window.location.pathname + window.location.search;
      if (next === current) return;

      show();
    };

    document.addEventListener('click', handleClick, true);
    window.addEventListener(START_EVENT, show);
    return () => {
      document.removeEventListener('click', handleClick, true);
      window.removeEventListener(START_EVENT, show);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="progressbar"
      aria-label="Loading"
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px] overflow-hidden bg-primary/15"
    >
      <div className="absolute h-full bg-primary" style={{ animation: 'nav-scan 1.6s ease-in-out infinite' }} />
    </div>
  );
}
