'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Field, FieldGrid, Panel } from '@/components/page';
import { SaveBar } from '@/components/save-bar';
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

  const discard = () => {
    setEnabled(settings.enabled);
    setHour(settings.hourLagos);
    setMinAmount(String(settings.minAmount));
  };

  return (
    <Panel
      title="Automatic daily payouts"
      description={description}
      aside={
        <label className="flex items-center gap-2 text-[13.5px] font-medium">
          <Switch checked={enabled} disabled={!canEdit || isPending} onCheckedChange={setEnabled} />
          {enabled ? 'On' : 'Off'}
        </label>
      }
    >
      <FieldGrid>
        <Field label="Run at" help="Lagos time.">
          <select
            value={hour}
            disabled={!canEdit || isPending}
            onChange={(e) => setHour(Number(e.target.value))}
            className="field pr-9 tabular-nums"
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {formatLagosHour(h)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Minimum payout" help="Smaller balances roll over to the next day.">
          <div className="field-wrap">
            <span>₦</span>
            <input
              type="number"
              min={100}
              step={50}
              value={minAmount}
              disabled={!canEdit || isPending}
              onChange={(e) => setMinAmount(e.target.value)}
              className="w-full border-0 bg-transparent text-foreground tabular-nums outline-none"
            />
          </div>
        </Field>
      </FieldGrid>
      <div className="rounded-[8px] bg-hi-soft px-3.5 py-3 text-[13px] leading-[1.5]">
        {enabled
          ? `Every day at ${formatLagosHour(hour)}, anyone owed ₦ ${Number(minAmount || 0).toLocaleString()} or more is sent their whole balance.`
          : 'Automatic payouts are off. Nobody is paid until someone runs payouts by hand.'}
      </div>
      {canEdit && (
        <SaveBar dirty={dirty} saving={isPending} label="Unsaved payout settings" onDiscard={discard} onSave={save} />
      )}
    </Panel>
  );
}
