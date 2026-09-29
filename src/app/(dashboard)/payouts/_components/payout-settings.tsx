'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { PayoutSchedule } from '@/lib/types';
import { formatLagosHour } from '../payout-format';

const HOURS = Array.from({ length: 24 }, (_, h) => h);

type Result = { ok: true } | { ok: false; error: string };

/** The daily-run switch, hour and minimum — shared by courier and vendor payouts. */
export function PayoutSettingsCard({
  settings,
  canEdit,
  description,
  save: saveSettings,
}: {
  settings: PayoutSchedule;
  canEdit: boolean;
  description: string;
  save: (values: PayoutSchedule) => Promise<Result>;
}) {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [hour, setHour] = useState(settings.hourLagos);
  const [minAmount, setMinAmount] = useState(String(settings.minAmount));
  const [isPending, startTransition] = useTransition();

  const dirty =
    enabled !== settings.enabled ||
    hour !== settings.hourLagos ||
    Number(minAmount) !== settings.minAmount;

  const save = () =>
    startTransition(async () => {
      const result = await saveSettings({
        enabled,
        hourLagos: hour,
        minAmount: Number(minAmount),
      });
      if (result.ok) toast.success('Payout settings saved');
      else toast.error(result.error);
    });

  return (
    <div className="rounded-[14px] border border-border bg-card p-[18px_22px] shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[15px] font-semibold text-foreground">Automatic daily payouts</div>
          <p className="mt-1 max-w-xl text-[13px] text-muted-foreground">{description}</p>
        </div>
        <label className="flex items-center gap-2 text-[13px] font-semibold text-foreground-secondary">
          <Switch checked={enabled} disabled={!canEdit || isPending} onCheckedChange={setEnabled} />
          {enabled ? 'On' : 'Off'}
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-[7px]">
          <span className="text-[13px] font-medium text-foreground-secondary">Run at (Lagos time)</span>
          <select
            value={hour}
            disabled={!canEdit || isPending}
            onChange={(e) => setHour(Number(e.target.value))}
            className="h-[40px] rounded-[10px] border border-input bg-muted px-3 text-[14px] font-semibold tabular-nums text-foreground outline-none"
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {formatLagosHour(h)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-[7px]">
          <span className="text-[13px] font-medium text-foreground-secondary">Minimum payout</span>
          <div className="flex h-[40px] items-center gap-2 rounded-[10px] border border-input bg-muted px-[13px]">
            <span className="text-[13px] font-semibold text-muted-foreground">₦</span>
            <input
              type="number"
              min={100}
              step={50}
              value={minAmount}
              disabled={!canEdit || isPending}
              onChange={(e) => setMinAmount(e.target.value)}
              className="w-28 border-none bg-transparent text-[14px] font-semibold tabular-nums text-foreground outline-none"
            />
          </div>
        </label>
        {canEdit && (
          <Button size="sm" disabled={!dirty || isPending} onClick={save} className="h-[40px]">
            {isPending ? 'Saving…' : 'Save settings'}
          </Button>
        )}
      </div>
    </div>
  );
}
