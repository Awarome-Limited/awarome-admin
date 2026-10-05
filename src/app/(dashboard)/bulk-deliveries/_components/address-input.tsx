'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { DeliveryAddress } from '@/lib/types';
import { getPlace, searchPlaces, type PlaceSuggestion } from '../actions';

const newSession = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : String(Date.now());

/**
 * Google-backed address picker. Free text is never accepted as an address on
 * its own — riders route on the coordinates — so the field stays "unresolved"
 * (amber) until a suggestion is picked.
 *
 * `query` seeds the search box, which is how pasted WhatsApp addresses arrive:
 * the text is there, and ops only has to pick the right match.
 */
export function AddressInput({
  value,
  query: initialQuery,
  onChange,
  placeholder = 'Search for an address…',
  compact = false,
}: {
  value: DeliveryAddress | null;
  query?: string;
  onChange: (address: DeliveryAddress | null, query: string) => void;
  placeholder?: string;
  compact?: boolean;
}) {
  const [query, setQuery] = useState(value?.address ?? initialQuery ?? '');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [isSearching, startSearch] = useTransition();
  const [isResolving, startResolve] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sessionRef = useRef(newSession());

  // Follow the parent when it swaps the address in (e.g. a saved pickup).
  const seed = value?.address ?? initialQuery ?? '';
  const [lastSeed, setLastSeed] = useState(seed);
  if (seed !== lastSeed) {
    setLastSeed(seed);
    setQuery(seed);
  }

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  function search(text: string) {
    clearTimeout(debounceRef.current);
    if (text.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      startSearch(async () => {
        const result = await searchPlaces(text, sessionRef.current);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        setSuggestions(result.data);
        setOpen(true);
      });
    }, 350);
  }

  function handleType(text: string) {
    setQuery(text);
    onChange(null, text);
    search(text);
  }

  function pick(place: PlaceSuggestion) {
    setOpen(false);
    setSuggestions([]);
    startResolve(async () => {
      const result = await getPlace(place.placeId, sessionRef.current);
      // A details call closes Google's billing session; start a fresh one.
      sessionRef.current = newSession();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setQuery(result.data.address);
      onChange(result.data, result.data.address);
    });
  }

  const resolved = !!value;

  return (
    <div className="relative min-w-0">
      <input
        value={query}
        onChange={(event) => handleType(event.target.value)}
        onFocus={() => {
          if (!resolved && query.trim().length >= 3 && !suggestions.length) {
            search(query);
          } else if (suggestions.length) {
            setOpen(true);
          }
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        aria-invalid={!resolved && query.trim().length > 0}
        title={resolved ? value.address : 'Pick a suggestion so the rider gets an exact location'}
        className={cn(
          'w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
          compact ? 'h-8' : 'h-9',
          resolved
            ? 'border-input focus-visible:border-ring'
            : query.trim()
              ? 'border-warning bg-warning/5 focus-visible:border-warning'
              : 'border-input focus-visible:border-ring'
        )}
      />
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
        {isResolving ? 'Locating…' : isSearching ? 'Searching…' : resolved ? '📍' : ''}
      </span>

      {open && suggestions.length > 0 && (
        <div className="absolute z-30 mt-1 max-h-[260px] w-full min-w-[280px] overflow-y-auto rounded-[10px] border border-border bg-card p-1 shadow-[0_8px_24px_rgba(20,22,42,0.14)]">
          {suggestions.map((place) => (
            <button
              key={place.placeId}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pick(place)}
              className="flex w-full flex-col rounded-[8px] px-2.5 py-2 text-left transition-colors hover:bg-muted"
            >
              <span className="truncate text-[13px] font-semibold text-foreground">{place.primary}</span>
              {place.secondary && (
                <span className="truncate text-[12px] text-muted-foreground">{place.secondary}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
