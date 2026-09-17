'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { downloadCsv, toCsv } from '@/lib/csv';
import { parseContacts, parseContactsCsv, type ParsedContacts } from '@/lib/contacts';
import { cn } from '@/lib/utils';

type Mode = 'paste' | 'csv';

const EMPTY: ParsedContacts = { phones: [], emails: [], invalid: [] };
const INVALID_PREVIEW = 8;

/** State for ContactsInput, lifted so the owning form can submit and reset it. */
export function useContactsInput() {
  const [mode, setMode] = useState<Mode>('paste');
  const [text, setText] = useState('');
  const [file, setFile] = useState<{ name: string; parsed: ParsedContacts } | null>(null);

  const pasted = useMemo(() => parseContacts(text), [text]);
  const parsed = mode === 'paste' ? pasted : (file?.parsed ?? EMPTY);

  async function readFile(selected?: File) {
    if (!selected) {
      setFile(null);
      return;
    }
    try {
      setFile({ name: selected.name, parsed: parseContactsCsv(await selected.text()) });
    } catch {
      setFile(null);
      toast.error('Could not read that file. Save it as CSV and try again.');
    }
  }

  return {
    mode,
    setMode,
    text,
    setText,
    file,
    readFile,
    parsed,
    count: parsed.phones.length + parsed.emails.length,
    hasInput: mode === 'paste' ? text.trim() !== '' : !!file,
    reset: () => {
      setText('');
      setFile(null);
    },
  };
}

export type ContactsInputState = ReturnType<typeof useContactsInput>;

function downloadTemplate() {
  downloadCsv(
    toCsv([
      { phone: '08031234567', email: 'ada@example.com' },
      { phone: '07012345678', email: '' },
      { phone: '', email: 'tunde@example.com' },
    ]),
    'audience-list-template.csv'
  );
}

export function ContactsInput({
  state,
  disabled,
}: {
  state: ContactsInputState;
  disabled?: boolean;
}) {
  const { mode, setMode, text, setText, file, readFile, parsed, hasInput } = state;

  return (
    <div className="flex flex-col gap-3">
      <div
        role="tablist"
        aria-label="How to add contacts"
        className="inline-flex self-start rounded-[10px] border border-border bg-muted/50 p-[3px]"
      >
        {(
          [
            ['paste', 'Type or paste'],
            ['csv', 'Upload CSV'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            className={cn(
              'rounded-[8px] px-3 py-[6px] text-[12.5px] font-semibold transition-colors',
              mode === value
                ? 'bg-card text-foreground shadow-[var(--shadow-card)]'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'paste' ? (
        <label className="flex flex-col gap-[7px]">
          <span className="sr-only">Phone numbers or emails</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={disabled}
            rows={5}
            placeholder="08031234567, ada@example.com, 07012345678"
            className="w-full resize-y rounded-[10px] border border-input bg-background px-[14px] py-3 font-mono text-[13px] leading-[1.55] text-foreground outline-none placeholder:font-sans placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <span className="text-[11.5px] text-muted-foreground">
            Phone numbers or emails, separated by commas or new lines.
          </span>
        </label>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-[9px] rounded-[12px] border-[1.5px] border-dashed border-input bg-background p-[22px_16px] text-center transition-colors hover:border-primary hover:bg-brand-tint">
            <span className="flex h-10 w-10 items-center justify-center rounded-[11px] border border-input bg-card text-primary">
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <path d="M17 8l-5-5-5 5" />
                <path d="M12 3v12" />
              </svg>
            </span>
            <span className="text-[13px] font-semibold text-foreground">
              {file ? (
                file.name
              ) : (
                <>
                  Drop CSV here or <span className="text-primary">browse</span>
                </>
              )}
            </span>
            <span className="text-[11.5px] text-muted-foreground">
              Columns “phone” and “email” · every cell is read
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={disabled}
              className="sr-only"
              onChange={(e) => {
                readFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
          <button
            type="button"
            onClick={downloadTemplate}
            className="self-start text-[12.5px] font-semibold text-primary underline-offset-2 hover:underline"
          >
            Download CSV template
          </button>
        </div>
      )}

      {hasInput && (
        <div
          aria-live="polite"
          className="flex flex-col gap-2 rounded-[10px] border border-border bg-muted/40 px-3.5 py-2.5"
        >
          <div className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
            <SummaryChip count={parsed.phones.length} label="phone" />
            <SummaryChip count={parsed.emails.length} label="email" />
            {parsed.invalid.length > 0 && (
              <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 font-semibold tabular-nums text-destructive">
                {parsed.invalid.length} not recognised
              </span>
            )}
          </div>
          {parsed.invalid.length > 0 && (
            <p className="break-words text-[12px] leading-[1.5] text-muted-foreground">
              Skipped:{' '}
              <span className="font-mono text-foreground-secondary">
                {parsed.invalid.slice(0, INVALID_PREVIEW).join(', ')}
              </span>
              {parsed.invalid.length > INVALID_PREVIEW &&
                ` and ${parsed.invalid.length - INVALID_PREVIEW} more`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryChip({ count, label }: { count: number; label: string }) {
  return (
    <span className="rounded-full bg-card px-2.5 py-0.5 font-semibold tabular-nums text-foreground ring-1 ring-border">
      {count.toLocaleString()} {label}
      {count === 1 ? '' : 's'}
    </span>
  );
}
