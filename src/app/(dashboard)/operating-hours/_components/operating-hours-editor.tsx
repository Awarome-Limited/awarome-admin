'use client';

import { InlineNotice, PageHeader, PageStack } from '@/components/page';
import { SaveBar } from '@/components/save-bar';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { OperatingDay, OperatingHoursConfig } from '@/lib/types';
import { updateOperatingHours } from '../actions';

const DAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const FULL_DAY = { opensAt: '00:00', closesAt: '23:59' };

// Always render all seven rows in Sunday→Saturday order, even if the API
// returns a partial week.
function toRows(days: OperatingDay[]): OperatingDay[] {
  const byDay = new Map(days.map((d) => [Number(d.day), d]));
  return DAY_LABELS.map((_, day) => {
    const stored = byDay.get(day);
    return {
      day,
      enabled: stored?.enabled ?? true,
      opensAt: stored?.opensAt ?? FULL_DAY.opensAt,
      closesAt: stored?.closesAt ?? FULL_DAY.closesAt,
    };
  });
}

const isFullDay = (row: OperatingDay) =>
  row.opensAt === FULL_DAY.opensAt && row.closesAt === FULL_DAY.closesAt;

function summarise(row: OperatingDay): string {
  if (!row.enabled) return 'Closed all day';
  if (isFullDay(row)) return 'Open 24 hours';
  if (row.closesAt <= row.opensAt) {
    return `${row.opensAt} – ${row.closesAt} (overnight, into the next day)`;
  }
  return `${row.opensAt} – ${row.closesAt}`;
}

export function OperatingHoursEditor({
  config,
}: {
  config: OperatingHoursConfig;
}) {
  const [rows, setRows] = useState<OperatingDay[]>(toRows(config.days ?? []));
  const [paused, setPaused] = useState(config.paused ?? false);
  const [closedMessage, setClosedMessage] = useState(config.closedMessage ?? '');
  const [isPending, startTransition] = useTransition();
  // What the API last stored, to drive the floating save bar and Discard.
  const snapshot = JSON.stringify({ rows, paused, closedMessage });
  const [saved, setSaved] = useState(snapshot);
  const dirty = snapshot !== saved;
  function discard() {
    const s = JSON.parse(saved);
    setRows(s.rows); setPaused(s.paused); setClosedMessage(s.closedMessage);
  }

  const status = config.status;

  function updateRow(day: number, patch: Partial<OperatingDay>) {
    setRows((prev) =>
      prev.map((row) => (row.day === day ? { ...row, ...patch } : row))
    );
  }

  function handleSave() {
    for (const row of rows) {
      if (!row.enabled) continue;
      if (!row.opensAt || !row.closesAt) {
        toast.error(`${DAY_LABELS[row.day]} needs both an open and close time.`);
        return;
      }
    }

    if (!paused && rows.every((row) => !row.enabled)) {
      toast.error(
        'Every day is switched off — that closes checkout permanently. Leave at least one day open.'
      );
      return;
    }

    startTransition(async () => {
      try {
        await updateOperatingHours({
          days: rows,
          paused,
          closedMessage: closedMessage.trim(),
        });
        setSaved(snapshot);
        toast.success(
          paused ? 'Checkout paused.' : 'Operating hours saved.'
        );
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to save operating hours.'
        );
      }
    });
  }

  return (
    <PageStack>
      <PageHeader title="Operating hours" subtitle={<>When we&apos;re open for business. Outside these hours customers can&apos;t check out: neither marketplace orders nor package deliveries. Times are West Africa Time. Changes apply within 15 seconds.</>} />

      <div className="flex flex-col gap-4" >
        {status &&
          (status.open ? (
            <div className="flex items-center gap-2.5 rounded-[8px] bg-positive-bg px-4 py-3 text-[13.5px] text-foreground">
              <span className="size-2 rounded-full bg-positive" />
              Open right now: {status.dayLabel}
              {status.opensAt ? ` ${status.opensAt}–${status.closesAt}` : ''}
            </div>
          ) : (
            <InlineNotice>
              Closed right now ({status.reason.replace('-', ' ')}). Customers can’t check out.
            </InlineNotice>
          ))}

        <div className="flex flex-col gap-[18px] rounded-[10px] border border-border bg-card px-6 py-[22px]">
          <div className="font-heading text-[17px] font-bold tracking-[-0.03em] text-foreground">
            Stop checkout now
          </div>
          <div className="mb-[18px] mt-1 text-[13px] text-muted-foreground">
            An immediate override for when delivery isn&apos;t available. Stays
            on until you switch it back off — the weekly schedule below never
            clears it.
          </div>
          <label className="flex items-center gap-3 text-[13px] font-semibold text-foreground-secondary">
            <Switch checked={paused} onCheckedChange={setPaused} />
            {paused ? 'Checkout is paused' : 'Checkout is following the schedule'}
          </label>

          <div className="mt-[18px] flex flex-col gap-[7px]">
            <span className="text-[13.5px] font-medium text-foreground">
              Message shown to customers when closed
            </span>
            <input
              value={closedMessage}
              onChange={(e) => setClosedMessage(e.target.value)}
              maxLength={300}
              placeholder="We're currently closed. Please try again during our opening hours."
              className="field w-full"
            />
          </div>
        </div>

        <div className="flex flex-col gap-[18px] rounded-[10px] border border-border bg-card px-6 py-[22px]">
          <div className="font-heading text-[17px] font-bold tracking-[-0.03em] text-foreground">
            Weekly schedule
          </div>
          <div className="mb-[18px] mt-1 text-[13px] text-muted-foreground">
            Switch a day off to close it entirely. Set 00:00 – 23:59 to stay open
            all day. A closing time at or before the opening time runs overnight
            into the next day.
          </div>

          <div className="flex flex-col gap-3">
            {rows.map((row) => (
              <div
                key={row.day}
                className="flex flex-col gap-3 rounded-[10px] border border-border bg-muted p-[14px_16px] sm:flex-row sm:items-center"
              >
                <label className="flex min-w-[150px] items-center gap-3 text-[13px] font-semibold text-foreground">
                  <Switch
                    checked={row.enabled}
                    onCheckedChange={(enabled) =>
                      updateRow(row.day, { enabled })
                    }
                  />
                  {DAY_LABELS[row.day]}
                </label>

                <div className="flex flex-1 flex-wrap items-center gap-2">
                  <input
                    type="time"
                    value={row.opensAt}
                    disabled={!row.enabled}
                    onChange={(e) =>
                      updateRow(row.day, { opensAt: e.target.value })
                    }
                    className="field font-semibold tabular-nums"
                  />
                  <span className="text-[13px] text-muted-foreground">to</span>
                  <input
                    type="time"
                    value={row.closesAt}
                    disabled={!row.enabled}
                    onChange={(e) =>
                      updateRow(row.day, { closesAt: e.target.value })
                    }
                    className="field font-semibold tabular-nums"
                  />
                  <button
                    type="button"
                    disabled={!row.enabled}
                    onClick={() => updateRow(row.day, FULL_DAY)}
                    className="rounded-full px-[10px] py-[7px] text-[12px] font-semibold text-foreground-secondary transition-colors hover:bg-muted disabled:opacity-40"
                  >
                    24h
                  </button>
                </div>

                <span className="min-w-[160px] text-[12px] text-muted-foreground sm:text-right">
                  {summarise(row)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <SaveBar dirty={dirty} saving={isPending} label="Unsaved operating hours" onDiscard={discard} onSave={handleSave} />
    </PageStack>
  );
}
