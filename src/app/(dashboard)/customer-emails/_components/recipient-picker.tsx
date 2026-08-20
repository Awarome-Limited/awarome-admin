'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { AvatarInitials } from '@/components/avatar-initials';
import { searchCustomers, type CustomerSuggestion, type EmailRecipient } from '../actions';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClass =
  'w-full rounded-[10px] border border-input bg-background px-[14px] py-[11px] text-[14px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50';

export function RecipientPicker({
  recipients,
  onChange,
}: {
  recipients: EmailRecipient[];
  onChange: (next: EmailRecipient[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<CustomerSuggestion[]>([]);
  const [isSearching, startSearch] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  function handleQueryChange(next: string) {
    setQuery(next);
    clearTimeout(debounceRef.current);

    if (next.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      startSearch(async () => {
        setSuggestions(await searchCustomers(next));
      });
    }, 350);
  }

  function add(recipient: EmailRecipient) {
    const email = recipient.email.trim().toLowerCase();
    if (recipients.some((existing) => existing.email.toLowerCase() === email)) {
      toast.error(`${recipient.email} is already on the list.`);
      return;
    }
    onChange([...recipients, recipient]);
    setQuery('');
    setSuggestions([]);
  }

  function addTypedEmail() {
    const email = query.trim();
    if (!email) return;
    if (!EMAIL_PATTERN.test(email)) {
      toast.error('That does not look like an email address.');
      return;
    }
    add({ email });
  }

  function remove(email: string) {
    onChange(recipients.filter((recipient) => recipient.email !== email));
  }

  return (
    <div className="flex flex-col gap-[7px]">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-foreground-secondary">
          To <span className="text-destructive">*</span>
        </span>
        {recipients.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[11.5px] font-medium text-muted-foreground hover:text-foreground"
          >
            Clear all
          </button>
        )}
      </div>

      {recipients.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {recipients.map((recipient) => (
            <span
              key={recipient.email}
              className="inline-flex max-w-full items-center gap-1.5 rounded-[8px] border border-border bg-muted/50 py-1 pl-2.5 pr-1.5 text-[12.5px] text-foreground"
            >
              <span className="truncate">
                {recipient.firstName ? `${recipient.firstName} · ` : ''}
                {recipient.email}
              </span>
              <button
                type="button"
                onClick={() => remove(recipient.email)}
                aria-label={`Remove ${recipient.email}`}
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-border hover:text-foreground"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          onKeyDown={(event) => {
            // Enter adds whatever has been typed rather than submitting the
            // composer — a half-addressed email is never what you meant to send.
            if (event.key === 'Enter') {
              event.preventDefault();
              addTypedEmail();
            }
          }}
          placeholder="Search customers by name, email or phone — or type an email address"
          className={inputClass}
        />
        {isSearching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11.5px] text-muted-foreground">
            Searching…
          </span>
        )}

        {suggestions.length > 0 && (
          <div className="absolute z-20 mt-1.5 max-h-[280px] w-full overflow-y-auto rounded-[10px] border border-border bg-card p-1 shadow-[0_8px_24px_rgba(20,22,42,0.14)]">
            {suggestions.map((customer) => (
              <button
                key={customer._id}
                type="button"
                onClick={() =>
                  add({
                    email: customer.email,
                    firstName: customer.firstName,
                    userId: customer._id,
                  })
                }
                className="flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left transition-colors hover:bg-muted"
              >
                <AvatarInitials name={customer.name} size="sm" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[13px] font-semibold text-foreground">
                    {customer.name}
                  </span>
                  <span className="truncate text-[12px] text-muted-foreground">
                    {customer.email}
                    {customer.phone ? ` · ${customer.phone}` : ''}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-[11.5px] text-muted-foreground">
        {recipients.length === 0
          ? 'Everyone you add gets their own copy, greeted by their own name.'
          : `${recipients.length} recipient${recipients.length === 1 ? '' : 's'} — each gets a separate email, not a shared thread.`}
      </p>
    </div>
  );
}
