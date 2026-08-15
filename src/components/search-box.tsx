'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export function SearchBox({ placeholder = 'Search…' }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const urlValue = searchParams.get('search') ?? '';

  // Controlled, so the box never loses the caret. Keying the input on the URL
  // value used to remount it every time the debounce fired, which dropped focus
  // (and any characters typed since) in the middle of a search.
  const [value, setValue] = useState(urlValue);

  // Re-sync only when the URL changed from somewhere else — a filter pill, a
  // back/forward navigation — not from our own debounced push.
  const lastPushedRef = useRef(urlValue);
  useEffect(() => {
    if (urlValue !== lastPushedRef.current) {
      lastPushedRef.current = urlValue;
      setValue(urlValue);
    }
  }, [urlValue]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const handleChange = (next: string) => {
    setValue(next);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = next.trim();
      if (trimmed) {
        params.set('search', trimmed);
      } else {
        params.delete('search');
      }
      // A new query means a new result set — page 1, or the rows shown would be
      // an offset into a list that no longer exists.
      params.delete('skip');
      lastPushedRef.current = trimmed;
      const query = params.toString();
      // replace, not push: otherwise every keystroke becomes a history entry
      // and Back has to be pressed once per character to leave the page.
      router.replace(query ? `${pathname}?${query}` : pathname);
    }, 400);
  };

  return (
    <div className="relative">
      <svg
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        placeholder={placeholder}
        className="w-full sm:w-56 rounded-[9px] border border-border-strong bg-card py-[7px] pl-8 pr-3 text-[13px] font-medium text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
      />
    </div>
  );
}
