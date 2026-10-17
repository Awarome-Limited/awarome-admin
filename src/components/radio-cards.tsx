'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface RadioCardOption<T extends string> {
  value: T;
  label: ReactNode;
  meta?: ReactNode;
}

/**
 * Mutually exclusive choices as cards (DESIGN.md "Radio card"): the selected
 * one gets a 1.5px brand border and a brand-soft fill.
 */
export function RadioCards<T extends string>({
  name,
  value,
  options,
  onChange,
  columns = 'auto',
}: {
  name: string;
  value: T;
  options: RadioCardOption<T>[];
  onChange: (value: T) => void;
  /** 'auto' packs cards 150px and up; 'stack' puts one per row with room for a description. */
  columns?: 'auto' | 'stack';
}) {
  return (
    <div
      role="radiogroup"
      className={cn(
        'grid gap-2',
        columns === 'auto' ? 'grid-cols-[repeat(auto-fit,minmax(150px,1fr))]' : 'grid-cols-1'
      )}
    >
      {options.map((option) => {
        const on = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              'flex cursor-pointer gap-3 rounded-[8px] p-3.5 transition-colors',
              on
                ? 'border-[1.5px] border-primary bg-brand-tint'
                : 'border border-border bg-card hover:border-muted-foreground'
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={on}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {columns === 'stack' && (
              <span
                aria-hidden
                className={cn(
                  'mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border-2',
                  on ? 'border-primary' : 'border-border-strong'
                )}
              >
                {on && <span className="size-2 rounded-full bg-primary" />}
              </span>
            )}
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-[14px] font-medium">{option.label}</span>
              {option.meta && (
                <span className={cn('text-[12.5px] leading-[1.5]', on ? 'text-foreground-secondary' : 'text-muted-foreground')}>
                  {option.meta}
                </span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}
