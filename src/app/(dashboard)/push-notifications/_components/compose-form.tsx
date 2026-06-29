'use client';

import { useTransition, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AdminAudienceList } from '@/lib/types';
import type { BroadcastPushPayload, BroadcastResult } from '../actions';

const AUDIENCE_OPTIONS: { value: BroadcastPushPayload['audience']; label: string }[] = [
  { value: 'all', label: 'Everyone' },
  { value: 'customers', label: 'Customers only' },
  { value: 'riders', label: 'Riders only' },
  { value: 'custom', label: 'Custom list' },
];

const REACH_LABELS: Record<BroadcastPushPayload['audience'], string> = {
  all: 'All registered users',
  customers: 'Customers with push enabled',
  riders: 'Riders with push enabled',
  custom: 'Selected audience list',
};

const MAX_BODY = 178;

const inputClass =
  'w-full rounded-[10px] border border-input bg-background px-[14px] py-[11px] text-[14px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50';

export function ComposeForm({
  action,
  audienceLists,
  onTitleChange,
  onBodyChange,
}: {
  action: (payload: BroadcastPushPayload) => Promise<BroadcastResult>;
  audienceLists: AdminAudienceList[];
  onTitleChange?: (v: string) => void;
  onBodyChange?: (v: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [audience, setAudience] = useState<BroadcastPushPayload['audience']>('all');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  function handleTitleChange(v: string) {
    setTitle(v);
    onTitleChange?.(v);
  }

  function handleBodyChange(v: string) {
    setBody(v);
    onBodyChange?.(v);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult(null);
    const formData = new FormData(e.currentTarget);
    const payload: BroadcastPushPayload = {
      title: title.trim(),
      body: body.trim(),
      audience,
      audienceListId:
        audience === 'custom'
          ? (formData.get('audienceListId')?.toString() ?? '')
          : undefined,
    };

    if (!payload.title || !payload.body) {
      toast.error('Title and message are required.');
      return;
    }
    if (audience === 'custom' && !payload.audienceListId) {
      toast.error('Please select an audience list.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await action(payload);
        setResult(res);
        toast.success(`Sent to ${res.sent} device${res.sent !== 1 ? 's' : ''}.`);
        formRef.current?.reset();
        setTitle('');
        setBody('');
        onTitleChange?.('');
        onBodyChange?.('');
        setAudience('all');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to send notification.');
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
      <label className="flex flex-col gap-[7px]">
        <span className="text-[13px] font-medium text-foreground-secondary">
          Title <span className="text-destructive">*</span>
        </span>
        <input
          name="title"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="e.g. New feature available!"
          maxLength={100}
          required
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-[7px]">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-foreground-secondary">
            Message <span className="text-destructive">*</span>
          </span>
          <span className="tabular-nums text-[11.5px] text-muted-foreground">
            {body.length} / {MAX_BODY}
          </span>
        </div>
        <textarea
          name="body"
          value={body}
          onChange={(e) => handleBodyChange(e.target.value)}
          placeholder="Write your notification message here…"
          required
          maxLength={MAX_BODY}
          rows={4}
          className="w-full resize-y rounded-[10px] border border-input bg-background px-[14px] py-3 text-[14px] leading-[1.5] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          style={{ minHeight: '104px' }}
        />
      </label>

      <div className="flex flex-col gap-[7px]">
        <span className="text-[13px] font-medium text-foreground-secondary">Audience</span>
        <div className="relative">
          <select
            name="audience"
            value={audience}
            onChange={(e) =>
              setAudience(e.target.value as BroadcastPushPayload['audience'])
            }
            className="w-full cursor-pointer appearance-none rounded-[10px] border border-input bg-background py-[11px] pl-[14px] pr-10 text-[14px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {AUDIENCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-[13px] top-1/2 -translate-y-1/2 text-muted-foreground"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      {audience === 'custom' && (
        <div className="flex flex-col gap-[7px]">
          <span className="text-[13px] font-medium text-foreground-secondary">List</span>
          {audienceLists.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              No lists yet. Create one in the Audience lists section below.
            </p>
          ) : (
            <div className="relative">
              <select
                name="audienceListId"
                className="w-full cursor-pointer appearance-none rounded-[10px] border border-input bg-background py-[11px] pl-[14px] pr-10 text-[14px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <option value="">— Select a list —</option>
                {audienceLists.map((l) => (
                  <option key={l._id} value={l._id}>
                    {l.name} ({l.matchedCount.toLocaleString()} users)
                  </option>
                ))}
              </select>
              <svg
                className="pointer-events-none absolute right-[13px] top-1/2 -translate-y-1/2 text-muted-foreground"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="rounded-[10px] border border-border bg-muted/40 px-4 py-3 text-[13px]">
          <span className="font-medium text-foreground">Last broadcast: </span>
          <span className="text-muted-foreground">
            {result.sent} sent · {result.failed} failed · {result.total} devices targeted
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-border pt-[18px]">
        <span className="text-[12px] text-muted-foreground">{REACH_LABELS[audience]}</span>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-5 py-[11px] text-[13.5px] font-semibold text-primary-foreground shadow-[var(--shadow-card)] transition-all hover:brightness-110 disabled:opacity-50"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 2L11 13" />
            <path d="M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
          {isPending ? 'Sending…' : 'Send notification'}
        </button>
      </div>
    </form>
  );
}
