'use client';

import {
  EMAIL_PRESETS,
  EMAIL_PRESET_CATEGORIES,
  type EmailPreset,
} from '@/lib/email-presets';
import { cn } from '@/lib/utils';

export function PresetPicker({
  selectedId,
  onSelect,
  onClear,
}: {
  selectedId: string | null;
  onSelect: (preset: EmailPreset) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="border-b border-border p-[18px_20px_14px]">
        <div className="text-[15px] font-semibold text-foreground">Presets</div>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          Start from tested copy for the things that go wrong, then edit freely.
        </p>
        <button
          type="button"
          onClick={onClear}
          className={cn(
            'mt-3 w-full rounded-[9px] border px-3 py-2 text-left text-[13px] font-semibold transition-colors',
            selectedId === null
              ? 'border-transparent bg-brand-tint text-primary'
              : 'border-border-strong bg-card text-foreground-secondary hover:bg-muted'
          )}
        >
          Custom email
          <span className="mt-0.5 block text-[11.5px] font-normal text-muted-foreground">
            Write it from scratch.
          </span>
        </button>
      </div>

      <div className="max-h-[560px] overflow-y-auto p-2">
        {EMAIL_PRESET_CATEGORIES.map((category) => {
          const presets = EMAIL_PRESETS.filter(
            (preset) => preset.category === category
          );
          if (presets.length === 0) return null;

          return (
            <div key={category} className="mb-1.5">
              <div className="px-2.5 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-[.04em] text-muted-foreground">
                {category}
              </div>
              {presets.map((preset) => {
                const active = preset.id === selectedId;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onSelect(preset)}
                    className={cn(
                      'mb-0.5 block w-full rounded-[9px] px-2.5 py-2 text-left transition-colors',
                      active
                        ? 'bg-brand-tint'
                        : 'hover:bg-muted'
                    )}
                  >
                    <span
                      className={cn(
                        'block text-[13px] font-semibold',
                        active ? 'text-primary' : 'text-foreground'
                      )}
                    >
                      {preset.label}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] leading-[1.45] text-muted-foreground">
                      {preset.summary}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
