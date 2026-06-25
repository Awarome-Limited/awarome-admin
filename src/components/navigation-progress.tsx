'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export function NavigationProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const prevPath = useRef(pathname);

  // Hide when the new page has rendered (pathname changed)
  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname;
      setVisible(false);
    }
  }, [pathname]);

  // Show when any internal link is clicked
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest('a[href]');
      if (!anchor) return;

      const href = anchor.getAttribute('href') ?? '';

      // Ignore external / hash / protocol links
      if (
        href.startsWith('http') ||
        href.startsWith('//') ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:')
      ) return;

      // Ignore same-page navigations (query/hash changes handled by loading.tsx)
      const targetPath = href.split('?')[0];
      if (!targetPath || targetPath === pathname) return;

      setVisible(true);
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px] overflow-hidden bg-primary/15"
    >
      <div
        className="absolute h-full bg-primary"
        style={{ animation: 'nav-scan 1.6s ease-in-out infinite' }}
      />
    </div>
  );
}
