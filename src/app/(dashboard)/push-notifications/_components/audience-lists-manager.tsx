'use client';

import { useTransition, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AdminAudienceList } from '@/lib/types';
import { createAudienceList } from '../actions';
import { formatDate } from '@/lib/format';

export function AudienceListsManager({
  lists: initialLists,
  onListCreated,
}: {
  lists: AdminAudienceList[];
  onListCreated: (list: AdminAudienceList) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [lists, setLists] = useState<AdminAudienceList[]>(initialLists);
  const [fileName, setFileName] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const result = await createAudienceList(formData);
        const newList: AdminAudienceList = { ...result, createdAt: new Date().toISOString() };
        setLists((prev) => [newList, ...prev]);
        onListCreated(newList);
        toast.success(
          `"${result.name}" created — ${result.matchedCount} of ${result.totalPhones} numbers matched`
        );
        formRef.current?.reset();
        setFileName('');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to create audience list.');
      }
    });
  }

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_1.5fr]">
      {/* Create a list */}
      <div className="rounded-[14px] border border-border bg-card p-[20px_22px] shadow-[var(--shadow-card)]">
        <div className="mb-4 text-[14.5px] font-semibold text-foreground">Create a list</div>
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-[7px]">
            <span className="text-[13px] font-medium text-foreground-secondary">
              List name <span className="text-destructive">*</span>
            </span>
            <input
              name="name"
              placeholder="e.g. Lagos customers, VIP users…"
              required
              maxLength={80}
              className="w-full rounded-[10px] border border-input bg-background px-[14px] py-[11px] text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </label>

          <div className="flex flex-col gap-[7px]">
            <span className="text-[13px] font-medium text-foreground-secondary">
              CSV file <span className="text-destructive">*</span>
            </span>
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
                {fileName ? (
                  fileName
                ) : (
                  <>
                    Drop CSV here or{' '}
                    <span className="text-primary">browse</span>
                  </>
                )}
              </span>
              <span className="text-[11.5px] text-muted-foreground">
                One number per line · header row "phone" is skipped
              </span>
              <input
                name="file"
                type="file"
                accept=".csv,text/csv"
                required
                className="sr-only"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex self-start items-center gap-[7px] rounded-[10px] bg-primary px-[18px] py-[10px] text-[13px] font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            {isPending ? 'Creating…' : 'Create list'}
          </button>
        </form>
      </div>

      {/* Your lists table */}
      <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-[9px] border-b border-border px-5 py-4">
          <span className="text-[14.5px] font-semibold text-foreground">Your lists</span>
          <span className="rounded-full bg-muted px-[9px] py-0.5 text-[12px] font-semibold tabular-nums text-foreground-secondary">
            {lists.length}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="px-5 py-[11px] text-left text-[11px] font-semibold uppercase tracking-[.04em] text-muted-foreground">
                  List
                </th>
                <th className="px-3.5 py-[11px] text-right text-[11px] font-semibold uppercase tracking-[.04em] text-muted-foreground">
                  Numbers
                </th>
                <th className="px-3.5 py-[11px] text-right text-[11px] font-semibold uppercase tracking-[.04em] text-muted-foreground">
                  Matched
                </th>
                <th className="px-3.5 py-[11px] text-left text-[11px] font-semibold uppercase tracking-[.04em] text-muted-foreground">
                  Created
                </th>
                <th className="px-5 py-[11px]" />
              </tr>
            </thead>
            <tbody>
              {lists.map((list) => {
                const rate =
                  list.totalPhones > 0
                    ? Math.round((list.matchedCount / list.totalPhones) * 100) + '%'
                    : '—';
                return (
                  <tr
                    key={list._id}
                    onClick={() =>
                      router.push(`/push-notifications/audience-lists/${list._id}`)
                    }
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                  >
                    <td className="border-t border-border px-5 py-[13px]">
                      <div className="flex items-center gap-[11px]">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-brand-tint text-primary">
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                        </span>
                        <div>
                          <div className="text-[13.5px] font-semibold text-foreground">
                            {list.name}
                          </div>
                          <div className="text-[11.5px] text-muted-foreground">
                            {rate} match rate
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="border-t border-border px-3.5 py-[13px] text-right tabular-nums font-semibold text-foreground-secondary">
                      {list.totalPhones.toLocaleString()}
                    </td>
                    <td className="border-t border-border px-3.5 py-[13px] text-right tabular-nums font-semibold text-foreground">
                      {list.matchedCount.toLocaleString()}
                    </td>
                    <td className="border-t border-border px-3.5 py-[13px] text-[12.5px] tabular-nums text-muted-foreground whitespace-nowrap">
                      {list.createdAt ? formatDate(list.createdAt) : '—'}
                    </td>
                    <td className="border-t border-border px-5 py-[13px] text-right">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-muted-foreground"
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </td>
                  </tr>
                );
              })}
              {lists.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-[13px] text-muted-foreground"
                  >
                    No audience lists yet. Create one using the form.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
