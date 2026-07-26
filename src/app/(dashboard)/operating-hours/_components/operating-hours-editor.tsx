'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 pb-[18px]">
        <div>
          <h1 className="text-[23px] font-bold tracking-tight text-foreground">
            Operating hours
          </h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            When we&apos;re open for business. Outside these hours customers
            can&apos;t check out — neither marketplace orders nor package
            deliveries. Times are West Africa Time. Changes apply within 15
            seconds.
          </p>
        </div>
        <Button type="button" onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>

      <div className="flex flex-col gap-4" style={{ maxWidth: 760 }}>
        {status && (
          <div
            className={`rounded-[14px] border p-[16px_20px] text-[13px] font-semibold ${
              status.open
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'border-destructive/40 bg-destructive/10 text-destructive'
            }`}
          >
            {status.open
              ? `Open right now — ${status.dayLabel}${
                  status.opensAt ? ` ${status.opensAt}–${status.closesAt}` : ''
                }`
              : `Closed right now (${status.reason.replace('-', ' ')}) — customers cannot check out`}
          </div>
        )}

        <div className="rounded-[14px] border border-border bg-card p-[22px_24px] shadow-[var(--shadow-card)]">
          <div className="text-[15px] font-semibold text-foreground">
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
            <span className="text-[13px] font-medium text-foreground-secondary">
              Message shown to customers when closed
            </span>
            <input
              value={closedMessage}
              onChange={(e) => setClosedMessage(e.target.value)}
              maxLength={300}
              placeholder="We're currently closed. Please try again during our opening hours."
              className="w-full rounded-[10px] border border-input bg-muted px-[13px] py-[10px] text-[14px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </div>
        </div>

        <div className="rounded-[14px] border border-border bg-card p-[22px_24px] shadow-[var(--shadow-card)]">
          <div className="text-[15px] font-semibold text-foreground">
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
                className="flex flex-col gap-3 rounded-[12px] border border-border bg-muted/40 p-[14px_16px] sm:flex-row sm:items-center"
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
                    className="rounded-[10px] border border-input bg-background px-[13px] py-[9px] text-[14px] font-semibold tabular-nums text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-40"
                  />
                  <span className="text-[13px] text-muted-foreground">to</span>
                  <input
                    type="time"
                    value={row.closesAt}
                    disabled={!row.enabled}
                    onChange={(e) =>
                      updateRow(row.day, { closesAt: e.target.value })
                    }
                    className="rounded-[10px] border border-input bg-background px-[13px] py-[9px] text-[14px] font-semibold tabular-nums text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-40"
                  />
                  <button
                    type="button"
                    disabled={!row.enabled}
                    onClick={() => updateRow(row.day, FULL_DAY)}
                    className="rounded-[9px] px-[10px] py-[7px] text-[12px] font-semibold text-foreground-secondary transition-colors hover:bg-muted disabled:opacity-40"
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
    </div>
  );
}
