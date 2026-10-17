'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { AvatarInitials } from '@/components/avatar-initials';
import { searchBulkCustomers, type BulkCustomer } from '../actions';

/** Picks the customer account the drops are booked under. */
export function CustomerPicker({
  value,
  onChange,
}: {
  value: BulkCustomer | null;
  onChange: (customer: BulkCustomer | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BulkCustomer[]>([]);
  const [isSearching, startSearch] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  function handleQuery(next: string) {
    setQuery(next);
    clearTimeout(debounceRef.current);
    if (next.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      startSearch(async () => setResults(await searchBulkCustomers(next)));
    }, 350);
  }

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-[8px] border-[1.5px] border-primary bg-brand-tint px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <AvatarInitials name={value.name} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[14px] font-medium text-foreground">{value.name}</span>
            <span className="truncate text-[12px] text-muted-foreground">
              {[value.phone, value.email].filter(Boolean).join(' · ')}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="shrink-0 text-[13.5px] font-medium text-primary hover:text-warning"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(event) => handleQuery(event.target.value)}
        placeholder="Search customers by name, email or phone"
        className="field w-full"
      />
      {isSearching && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11.5px] text-muted-foreground">
          Searching…
        </span>
      )}
      {results.length > 0 && (
        <div className="absolute z-30 mt-1.5 max-h-[280px] w-full overflow-y-auto rounded-[8px] border border-border bg-popover p-1 shadow-[0_12px_32px_rgba(18,4,96,0.14)]">
          {results.map((customer) => (
            <button
              key={customer._id}
              type="button"
              onClick={() => {
                onChange(customer);
                setQuery('');
                setResults([]);
              }}
              className="flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left transition-colors hover:bg-muted"
            >
              <AvatarInitials name={customer.name} size="sm" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[13.5px] font-medium text-foreground">{customer.name}</span>
                <span className="truncate text-[12px] text-muted-foreground">
                  {[customer.phone, customer.email].filter(Boolean).join(' · ')}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
      {!isSearching && query.trim().length >= 2 && results.length === 0 && (
        <p className="mt-1.5 text-[12px] text-muted-foreground">
          No customers match. They need an Awarome account to track their deliveries.
        </p>
      )}
    </div>
  );
}
