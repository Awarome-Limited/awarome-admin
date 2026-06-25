'use client';

import { useTransition, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BroadcastPushPayload, BroadcastResult } from '../actions';

const AUDIENCE_OPTIONS: { value: BroadcastPushPayload['audience']; label: string; description: string }[] = [
  { value: 'all', label: 'Everyone', description: 'All customers and riders' },
  { value: 'customers', label: 'Customers only', description: 'Users who have placed orders' },
  { value: 'riders', label: 'Riders only', description: 'Delivery riders' },
];

export function ComposeForm({
  action,
}: {
  action: (payload: BroadcastPushPayload) => Promise<BroadcastResult>;
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult(null);
    const data = new FormData(e.currentTarget);
    const payload: BroadcastPushPayload = {
      title: data.get('title')?.toString().trim() ?? '',
      body: data.get('body')?.toString().trim() ?? '',
      audience: (data.get('audience')?.toString() ?? 'all') as BroadcastPushPayload['audience'],
    };

    if (!payload.title || !payload.body) {
      toast.error('Title and message are required.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await action(payload);
        setResult(res);
        toast.success(`Sent to ${res.sent} device${res.sent !== 1 ? 's' : ''}.`);
        formRef.current?.reset();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to send notification.');
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          name="title"
          placeholder="e.g. New feature available!"
          required
          maxLength={100}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="body">
          Message <span className="text-destructive">*</span>
        </Label>
        <textarea
          id="body"
          name="body"
          placeholder="Write your notification message here…"
          required
          maxLength={500}
          rows={3}
          className="w-full resize-none rounded-[10px] border border-input bg-background px-3 py-2.5 text-[14px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="audience">Audience</Label>
        <select
          id="audience"
          name="audience"
          defaultValue="all"
          className="w-full rounded-[10px] border border-input bg-background px-3 py-2.5 text-[14px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {AUDIENCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label} — {opt.description}
            </option>
          ))}
        </select>
      </div>

      {result && (
        <div className="rounded-[10px] border border-border bg-muted/40 px-4 py-3 text-[13px]">
          <span className="font-medium text-foreground">Last broadcast: </span>
          <span className="text-muted-foreground">
            {result.sent} sent · {result.failed} failed · {result.total} devices targeted
          </span>
        </div>
      )}

      <div className="flex items-center justify-end border-t border-border pt-4">
        <Button type="submit" disabled={isPending} className="min-w-[160px]">
          {isPending ? 'Sending…' : 'Send notification'}
        </Button>
      </div>
    </form>
  );
}
