'use client';

import { useId } from 'react';
import {
  AUDIENCE_LABELS,
  MESSAGE_MAX,
  PUSH_AUDIENCES,
  TITLE_MAX,
  type AudienceListOption,
  type DraftErrors,
  type DraftField,
  type PushDraft,
} from '@/lib/scheduled-push';
import { cn } from '@/lib/utils';

const fieldClass = (invalid: boolean) =>
  cn(
    'w-full rounded-[10px] border bg-background px-[13px] py-[10px] text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 disabled:opacity-60',
    invalid
      ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/25'
      : 'border-input focus-visible:border-ring focus-visible:ring-ring/50'
  );

function Chevron() {
  return (
    <svg
      className="pointer-events-none absolute right-[12px] top-1/2 -translate-y-1/2 text-muted-foreground"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function ScheduleRowEditor({
  draft,
  lists,
  errors,
  showEmptyErrors,
  reach,
  onChange,
  disabled,
}: {
  draft: PushDraft;
  lists: AudienceListOption[];
  errors: DraftErrors;
  /** Off until a submit attempt, so a fresh row isn't covered in "required". */
  showEmptyErrors: boolean;
  /** Devices the chosen audience reaches now; undefined hides the line. */
  reach?: number | null;
  onChange: (patch: Partial<PushDraft>) => void;
  disabled?: boolean;
}) {
  const id = useId();

  const valueOf: Record<DraftField, string> = {
    title: draft.title,
    message: draft.message,
    audience: draft.audience,
    audienceListId: draft.audienceListId,
    date: draft.date,
    time: draft.time,
  };
  // Empty-field errors wait for a submit attempt; anything the CSV could not
  // read, or a value that is wrong rather than missing, shows straight away.
  const errorFor = (field: DraftField) =>
    errors[field] &&
    (showEmptyErrors || valueOf[field] !== '' || !!draft.hints?.[field])
      ? errors[field]
      : undefined;

  const fieldError = (field: DraftField) => {
    const message = errorFor(field);
    return message ? (
      <span id={`${id}-${field}-error`} className="text-[12px] font-medium text-destructive">
        {message}
      </span>
    ) : null;
  };

  const describedBy = (field: DraftField) =>
    errorFor(field) ? `${id}-${field}-error` : undefined;

  return (
    <div className="flex flex-col gap-3.5">
      <label className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-medium text-foreground-secondary">Title</span>
        <input
          value={draft.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="e.g. Breakfast is on us ☕"
          maxLength={TITLE_MAX}
          disabled={disabled}
          aria-invalid={!!errorFor('title')}
          aria-describedby={describedBy('title')}
          className={fieldClass(!!errorFor('title'))}
        />
        {fieldError('title')}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="flex items-center justify-between">
          <span className="text-[12.5px] font-medium text-foreground-secondary">Message</span>
          <span
            className={cn(
              'tabular-nums text-[11.5px]',
              draft.message.trim().length > MESSAGE_MAX ? 'font-semibold text-destructive' : 'text-muted-foreground'
            )}
          >
            {draft.message.trim().length} / {MESSAGE_MAX}
          </span>
        </span>
        <textarea
          value={draft.message}
          onChange={(e) => onChange({ message: e.target.value })}
          placeholder="Write your notification message here…"
          rows={3}
          disabled={disabled}
          aria-invalid={!!errorFor('message')}
          aria-describedby={describedBy('message')}
          className={cn(fieldClass(!!errorFor('message')), 'resize-y leading-[1.5]')}
        />
        {fieldError('message')}
      </label>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-medium text-foreground-secondary">Audience</span>
          <span className="relative">
            <select
              value={draft.audience}
              onChange={(e) =>
                onChange({ audience: e.target.value as PushDraft['audience'] })
              }
              disabled={disabled}
              aria-invalid={!!errorFor('audience')}
              aria-describedby={describedBy('audience')}
              className={cn(fieldClass(!!errorFor('audience')), 'cursor-pointer appearance-none pr-9')}
            >
              {draft.audience === '' && <option value="">Choose an audience</option>}
              {PUSH_AUDIENCES.map((audience) => (
                <option key={audience} value={audience}>
                  {AUDIENCE_LABELS[audience]}
                </option>
              ))}
            </select>
            <Chevron />
          </span>
          {fieldError('audience')}
          {reach !== undefined && !errorFor('audience') && (
            <span className="text-[11.5px] text-muted-foreground">
              {reach === null
                ? 'Reach unavailable'
                : `≈ ${reach.toLocaleString()} device${reach === 1 ? '' : 's'} right now`}
            </span>
          )}
        </label>

        {draft.audience === 'list' && (
          <label className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-medium text-foreground-secondary">Saved list</span>
            <span className="relative">
              <select
                value={draft.audienceListId}
                onChange={(e) => onChange({ audienceListId: e.target.value })}
                disabled={disabled || lists.length === 0}
                aria-invalid={!!errorFor('audienceListId')}
                aria-describedby={describedBy('audienceListId')}
                className={cn(
                  fieldClass(!!errorFor('audienceListId')),
                  'cursor-pointer appearance-none pr-9'
                )}
              >
                <option value="">
                  {lists.length === 0 ? 'No saved lists yet' : 'Choose a list'}
                </option>
                {lists.map((list) => (
                  <option key={list._id} value={list._id}>
                    {list.name}
                  </option>
                ))}
              </select>
              <Chevron />
            </span>
            {fieldError('audienceListId')}
          </label>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-medium text-foreground-secondary">Date</span>
          <input
            type="date"
            value={draft.date}
            onChange={(e) => onChange({ date: e.target.value })}
            disabled={disabled}
            aria-invalid={!!errorFor('date')}
            aria-describedby={describedBy('date')}
            className={fieldClass(!!errorFor('date'))}
          />
          {fieldError('date')}
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-medium text-foreground-secondary">
            Time <span className="font-normal text-muted-foreground">(Lagos, WAT)</span>
          </span>
          <input
            type="time"
            step={60}
            value={draft.time}
            onChange={(e) => onChange({ time: e.target.value.slice(0, 5) })}
            disabled={disabled}
            aria-invalid={!!errorFor('time')}
            aria-describedby={describedBy('time')}
            className={fieldClass(!!errorFor('time'))}
          />
          {fieldError('time')}
        </label>
      </div>
    </div>
  );
}
