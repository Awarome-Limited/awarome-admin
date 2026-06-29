'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useRef } from 'react';
import { Input } from '@/components/ui/input';

export function SearchBox({ placeholder = 'Search…' }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const initialValue = searchParams.get('search') ?? '';

  const handleChange = (next: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (next) {
        params.set('search', next);
      } else {
        params.delete('search');
      }
      params.delete('skip');
      router.push(`${pathname}?${params.toString()}`);
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
        key={initialValue}
        defaultValue={initialValue}
        onChange={(event) => handleChange(event.target.value)}
        placeholder={placeholder}
        className="w-56 rounded-[9px] border border-border-strong bg-card py-[7px] pl-8 pr-3 text-[13px] font-medium text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
      />
    </div>
  );
}
