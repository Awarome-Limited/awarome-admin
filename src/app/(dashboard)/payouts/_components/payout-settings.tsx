'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { PayoutSettings } from '@/lib/types';
import { updatePayoutSettings } from '../actions';
import { formatLagosHour } from '../payout-format';

const HOURS = Array.from({ length: 24 }, (_, h) => h);

export function PayoutSettingsCard({
  settings,
  canEdit,
}: {
  settings: PayoutSettings;
  canEdit: boolean;
}) {
  const [enabled, setEnabled] = useState(settings.payoutsEnabled);
  const [hour, setHour] = useState(settings.payoutHourLagos);
  const [minAmount, setMinAmount] = useState(String(settings.payoutMinAmount));
  const [isPending, startTransition] = useTransition();

  const dirty =
    enabled !== settings.payoutsEnabled ||
    hour !== settings.payoutHourLagos ||
    Number(minAmount) !== settings.payoutMinAmount;

  const save = () =>
    startTransition(async () => {
      const result = await updatePayoutSettings({
        payoutsEnabled: enabled,
        payoutHourLagos: hour,
        payoutMinAmount: Number(minAmount),
      });
      if (result.ok) toast.success('Payout settings saved');
      else toast.error(result.error);
    });

  return (
    <div className="rounded-[14px] border border-border bg-card p-[18px_22px] shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[15px] font-semibold text-foreground">Automatic daily payouts</div>
          <p className="mt-1 max-w-xl text-[13px] text-muted-foreground">
            Once a day, every courier owed at least the minimum is sent their whole balance by
            Paystack transfer. Smaller balances roll over to the next day. Transfer OTP must be
            turned off in the Paystack dashboard, and the Paystack balance funded, or transfers
            will wait or fail.
          </p>
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
