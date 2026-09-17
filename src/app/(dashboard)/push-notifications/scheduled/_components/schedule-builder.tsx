'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { downloadCsv } from '@/lib/csv';
import { formatLagosDateTime } from '@/lib/format';
import {
  AUDIENCE_LABELS,
  DEFAULT_SEND_TIME,
  MAX_ROWS,
  addDays,
  blankDraft,
  buildTemplateCsv,
  draftKey,
  draftToPayload,
  hasErrors,
  lagosDate,
  lagosToUtcIso,
  parseScheduleCsv,
  validateDraft,
  type AudienceListOption,
  type DraftField,
  type PushDraft,
} from '@/lib/scheduled-push';
import type { ScheduledPushReach } from '@/lib/types';
import { cn } from '@/lib/utils';
import { PushPreviewCard } from '../../_components/push-preview-card';
import { createScheduledPushes } from '../actions';
import { ScheduleRowEditor } from './schedule-row-editor';

const pushes = (n: number) => `${n.toLocaleString()} push${n === 1 ? '' : 'es'}`;
const needFixing = (n: number) => `${pushes(n)} need${n === 1 ? 's' : ''} fixing`;

const isBlank = (row: PushDraft) => !row.title.trim() && !row.message.trim();

export function reachFor(
  draft: Pick<PushDraft, 'audience' | 'audienceListId'>,
  reach: ScheduledPushReach | null
): number | null | undefined {
  if (!draft.audience) return undefined;
  if (!reach) return null;
  if (draft.audience === 'list') {
    return draft.audienceListId ? (reach.lists[draft.audienceListId] ?? null) : undefined;
  }
  return reach[draft.audience];
}

const CSV_HELP: [string, string][] = [
  ['title', `Up to 100 characters`],
  ['message', `Up to 178 characters`],
  ['audience', 'customers, vendors, riders, everyone, or list'],
  ['audience_list', 'The saved list’s name, when audience is list'],
  ['date', '2026-09-18 or 18/09/2026'],
  ['time', '09:00 or 9:00 AM, Lagos time'],
];

export function ScheduleBuilder({
  lists,
  reach,
}: {
  lists: AudienceListOption[];
  reach: ScheduledPushReach | null;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<PushDraft[]>(() => [blankDraft()]);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [fileError, setFileError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const scheduled = useRef(false);

  const errorsByKey = new Map(rows.map((row) => [row.key, validateDraft(row, lists)]));
  const invalidRows = rows.filter((row) => hasErrors(errorsByKey.get(row.key)!));
  const sendTimes = rows
    .map((row) => lagosToUtcIso(row.date, row.time))
    .filter((iso): iso is string => !!iso)
    .sort();
  const dirty = rows.some((row) => !isBlank(row));

  // A month of pushes typed by hand is too much to lose to a stray refresh.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (!scheduled.current) event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  function clearServerError(key: string) {
    setServerErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function updateRow(key: string, patch: Partial<PushDraft>) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row;
        if (!row.hints) return { ...row, ...patch };
        // A CSV hint describes the value that was in the file; once the field
        // is edited it no longer applies.
        const hints = { ...row.hints };
        for (const field of Object.keys(patch) as DraftField[]) delete hints[field];
        return { ...row, ...patch, hints };
      })
    );
    clearServerError(key);
  }

  function roomFor(count: number) {
    if (rows.length + count <= MAX_ROWS) return true;
    toast.error(`Up to ${MAX_ROWS} pushes can be scheduled at once.`);
    return false;
  }

  // A new row picks up where the last one left off — same audience and time,
  // next day — which is what building a daily series needs.
  function addRow() {
    if (!roomFor(1)) return;
    const last = rows[rows.length - 1];
    setRows((prev) => [
      ...prev,
      blankDraft({
        audience: last?.audience || 'customers',
        audienceListId: last?.audienceListId ?? '',
        time: last?.time || DEFAULT_SEND_TIME,
        date: last?.date ? addDays(last.date, 1) : lagosDate(1),
      }),
    ]);
  }

  function duplicateRow(key: string) {
    if (!roomFor(1)) return;
    setRows((prev) => {
      const index = prev.findIndex((row) => row.key === key);
      const source = prev[index];
      const copy: PushDraft = {
        ...source,
        key: draftKey(),
        date: source.date ? addDays(source.date, 1) : source.date,
        hints: undefined,
      };
      return [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)];
    });
  }

  function removeRow(key: string) {
    setRows((prev) => {
      const next = prev.filter((row) => row.key !== key);
      return next.length ? next : [blankDraft()];
    });
    clearServerError(key);
  }

  function removeInvalidRows() {
    const invalidKeys = new Set(invalidRows.map((row) => row.key));
    setRows((prev) => {
      const next = prev.filter((row) => !invalidKeys.has(row.key));
      return next.length ? next : [blankDraft()];
    });
    toast.success(`Removed ${pushes(invalidKeys.size)} that needed fixing.`);
  }

  async function importCsv(file: File) {
    let text: string;
    try {
      text = await file.text();
    } catch {
      toast.error('Could not read that file. Save it as CSV and try again.');
      return;
    }

    const { rows: imported, fileErrors } = parseScheduleCsv(text, lists);
    if (fileErrors.length) {
      setFileError(fileErrors[0]);
      toast.error(fileErrors[0]);
      return;
    }
    setFileError(null);

    // The untouched starter row would otherwise sit above the import as an error.
    const kept = rows.filter((row) => !isBlank(row));
    const room = MAX_ROWS - kept.length;
    const added = imported.slice(0, Math.max(room, 0));
    setRows(kept.length + added.length ? [...kept, ...added] : [blankDraft()]);

    const badCount = added.filter((row) => hasErrors(validateDraft(row, lists))).length;
    if (!added.length) {
      toast.error(`No room: up to ${MAX_ROWS} pushes can be scheduled at once.`);
    } else {
      toast.success(
        `Added ${pushes(added.length)} from ${file.name}` +
          (badCount ? ` — ${badCount} need${badCount === 1 ? 's' : ''} fixing` : '') +
          (added.length < imported.length ? `. Only the first ${added.length} fit the ${MAX_ROWS}-push limit.` : '')
      );
    }
  }

  function requestSchedule() {
    setSubmitAttempted(true);
    if (invalidRows.length) {
      toast.error(`${needFixing(invalidRows.length)} before scheduling.`);
      document
        .getElementById(`push-row-${invalidRows[0].key}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setConfirmOpen(true);
  }

  function schedule() {
    const snapshot = rows;
    startTransition(async () => {
      const result = await createScheduledPushes(snapshot.map(draftToPayload));
      setConfirmOpen(false);

      if (result.ok) {
        scheduled.current = true;
        toast.success(`Scheduled ${pushes(result.created)}.`);
        router.push('/push-notifications/scheduled');
        return;
      }

      if (result.rowErrors?.length) {
        const byKey: Record<string, string> = {};
        for (const { index, message } of result.rowErrors) {
          const row = snapshot[index];
          if (row) byKey[row.key] = message;
        }
        setServerErrors(byKey);
        const first = snapshot[result.rowErrors[0].index];
        if (first) {
          document
            .getElementById(`push-row-${first.key}`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      toast.error(result.error);
    });
  }

  const audienceMix = Object.entries(
    rows.reduce<Record<string, number>>((mix, row) => {
      if (!row.audience) return mix;
      const label =
        row.audience === 'list'
          ? (lists.find((l) => l._id === row.audienceListId)?.name ?? 'a saved list')
          : AUDIENCE_LABELS[row.audience];
      mix[label] = (mix[label] ?? 0) + 1;
      return mix;
    }, {})
  );

  return (
    <div className="flex flex-col gap-4">
      {/* CSV toolbar */}
      <div className="rounded-[14px] border border-border bg-card p-[18px_20px] shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[14.5px] font-semibold text-foreground">Bulk add from a CSV</div>
            <div className="mt-0.5 text-[12.5px] text-muted-foreground">
              Fill in the template, upload it, then review every row below before scheduling.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                downloadCsv(buildTemplateCsv(lists), 'scheduled-push-template.csv')
              }
              className="inline-flex items-center gap-1.5 rounded-[9px] border border-border-strong bg-card px-3.5 py-[7px] text-[13px] font-semibold text-foreground-secondary transition-colors hover:bg-muted"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download template
            </button>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-[9px] bg-primary px-3.5 py-[7px] text-[13px] font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <path d="M17 8l-5-5-5 5" />
                <path d="M12 3v12" />
              </svg>
              Upload CSV
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) importCsv(file);
              }}
            />
          </div>
        </div>

        <details className="group mt-3 text-[12.5px]">
          <summary className="cursor-pointer select-none font-semibold text-primary">
            What goes in each column
          </summary>
          <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
            {CSV_HELP.map(([column, help]) => (
              <div key={column} className="contents">
                <dt className="font-mono text-foreground">{column}</dt>
                <dd className="text-muted-foreground">{help}</dd>
              </div>
            ))}
          </dl>
        </details>

        {fileError && (
          <p role="alert" className="mt-3 rounded-[10px] bg-destructive/10 px-3.5 py-2.5 text-[12.5px] font-medium text-destructive">
            {fileError}
          </p>
        )}
      </div>

      {/* Draft rows */}
      {rows.map((row, index) => {
        const errors = errorsByKey.get(row.key)!;
        // CSV rows are under review from the moment they land.
        const showEmptyErrors = submitAttempted || !!row.hints;
        const invalid = hasErrors(errors) && showEmptyErrors;
        const sendAt = lagosToUtcIso(row.date, row.time);
        return (
          <section
            key={row.key}
            id={`push-row-${row.key}`}
            aria-label={`Push ${index + 1}`}
            className={cn(
              'rounded-[14px] border bg-card shadow-[var(--shadow-card)]',
              invalid || serverErrors[row.key] ? 'border-destructive/50' : 'border-border'
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-tint px-1.5 text-[12px] font-bold tabular-nums text-primary">
                  {index + 1}
                </span>
                <span className="text-[13px] font-semibold text-foreground">
                  {sendAt ? `${formatLagosDateTime(sendAt)} WAT` : 'No send time yet'}
                </span>
                {row.hints && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    From CSV
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => duplicateRow(row.key)}
                  disabled={isPending}
                  title="Copy this push to the next day"
                >
                  Duplicate
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRow(row.key)}
                  disabled={isPending}
                  className="text-destructive hover:text-destructive"
                >
                  Remove
                </Button>
              </div>
            </div>

            {serverErrors[row.key] && (
              <p role="alert" className="mx-5 mt-4 rounded-[10px] bg-destructive/10 px-3.5 py-2.5 text-[12.5px] font-medium text-destructive">
                {serverErrors[row.key]}
              </p>
            )}

            <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_280px]">
              <ScheduleRowEditor
                draft={row}
                lists={lists}
                errors={errors}
                showEmptyErrors={showEmptyErrors}
                reach={reachFor(row, reach)}
                onChange={(patch) => updateRow(row.key, patch)}
                disabled={isPending}
              />
              <div
                className="hidden self-start rounded-[16px] p-3.5 lg:block"
                style={{ background: 'linear-gradient(150deg, var(--brand-tint), var(--muted, #f4f5f7))' }}
              >
                <PushPreviewCard title={row.title} body={row.message} />
              </div>
            </div>
          </section>
        );
      })}

      <button
        type="button"
        onClick={addRow}
        disabled={isPending || rows.length >= MAX_ROWS}
        className="flex items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-input bg-background py-4 text-[13.5px] font-semibold text-primary transition-colors hover:border-primary hover:bg-brand-tint disabled:opacity-50"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
        Add another push
      </button>

      {/* Summary + submit */}
      <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-border bg-card/95 px-5 py-3.5 shadow-[0_8px_24px_rgba(20,22,42,0.12)] backdrop-blur">
        <div className="min-w-0 text-[13px]">
          <div className="font-semibold text-foreground">
            {pushes(rows.length)}
            {submitAttempted && invalidRows.length > 0 && (
              <span className="text-destructive">
                {' '}
                · {invalidRows.length} need{invalidRows.length === 1 ? 's' : ''} fixing
              </span>
            )}
          </div>
          <div className="text-[12px] text-muted-foreground">
            {sendTimes.length === 0
              ? 'Times are Lagos time (WAT)'
              : sendTimes.length === 1
                ? `Sends ${formatLagosDateTime(sendTimes[0])} WAT`
                : `${formatLagosDateTime(sendTimes[0])} → ${formatLagosDateTime(sendTimes[sendTimes.length - 1])} WAT`}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {submitAttempted && invalidRows.length > 0 && invalidRows.length < rows.length && (
            <Button type="button" variant="outline" onClick={removeInvalidRows} disabled={isPending}>
              Remove {invalidRows.length} with errors
            </Button>
          )}
          <button
            type="button"
            onClick={requestSchedule}
            disabled={isPending}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-5 py-[10px] text-[13.5px] font-semibold text-primary-foreground shadow-[var(--shadow-card)] transition-all hover:brightness-110 disabled:opacity-50"
          >
            {isPending ? 'Scheduling…' : `Schedule ${pushes(rows.length)}`}
          </button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !isPending && setConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Schedule {pushes(rows.length)}?</AlertDialogTitle>
            <AlertDialogDescription>
              {sendTimes.length === 1
                ? `It goes out ${formatLagosDateTime(sendTimes[0])} WAT.`
                : `The first goes out ${formatLagosDateTime(sendTimes[0])} and the last ${formatLagosDateTime(sendTimes[sendTimes.length - 1])} WAT.`}{' '}
              You can edit or cancel each one until it sends.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {audienceMix.length > 0 && (
            <ul className="flex flex-col gap-1 rounded-[10px] bg-muted/50 px-3.5 py-2.5 text-[13px]">
              {audienceMix.map(([label, count]) => (
                <li key={label} className="flex justify-between gap-3">
                  <span className="text-foreground-secondary">{label}</span>
                  <span className="font-semibold tabular-nums text-foreground">{pushes(count)}</span>
                </li>
              ))}
            </ul>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Keep editing</AlertDialogCancel>
            <Button onClick={schedule} disabled={isPending}>
              {isPending ? 'Scheduling…' : 'Schedule'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
