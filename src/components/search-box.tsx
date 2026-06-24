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
    <Input
      key={initialValue}
      defaultValue={initialValue}
      onChange={(event) => handleChange(event.target.value)}
      placeholder={placeholder}
      className="max-w-xs"
    />
  );
}
