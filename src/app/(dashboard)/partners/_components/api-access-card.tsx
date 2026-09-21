'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AdminPartner } from '@/lib/types';
import { updateApiAccess } from '../actions';

/**
 * Only what this card edits. Narrowed deliberately: the full partner document
 * carries the legacy encrypted `apiKey`, which must not cross into the client
 * bundle.
 */
type ApiAccessPartner = Pick<
  AdminPartner,
  '_id' | 'apiEnabled' | 'defaultRequirePin' | 'lowBalanceThreshold'
>;

/** The form works in naira; the API stores kobo. */
const koboToNaira = (kobo?: number) => (kobo ? String(kobo / 100) : '0');

export function ApiAccessCard({ partner }: { partner: ApiAccessPartner }) {
  const [apiEnabled, setApiEnabled] = useState(Boolean(partner.apiEnabled));
  const [requirePin, setRequirePin] = useState(Boolean(partner.defaultRequirePin));
  const [threshold, setThreshold] = useState(koboToNaira(partner.lowBalanceThreshold));
  const [isPending, startTransition] = useTransition();

  function save() {
    const naira = Number(threshold);
    if (!Number.isFinite(naira) || naira < 0) {
      toast.error('Enter a low-balance threshold of zero or more.');
      return;
    }

    startTransition(async () => {
      const result = await updateApiAccess(partner._id, {
        apiEnabled,
        defaultRequirePin: requirePin,
        lowBalanceThreshold: Math.round(naira * 100),
      });
      if (result.ok) toast.success('API access updated.');
      else toast.error(result.error);
    });
  }

  return (
    <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="text-[15px] font-semibold text-foreground">API access</div>
      <p className="mt-0.5 text-[13px] text-muted-foreground">
        Controls the delivery API for this partner.
      </p>

      <div className="mt-4 flex flex-col gap-4">
        <label className="flex items-start justify-between gap-4">
          <span className="flex flex-col gap-0.5">
            <span className="text-[13px] font-medium text-foreground">Enable the API</span>
            <span className="text-[12px] text-muted-foreground">
              Off means every call is refused, whatever keys exist.
            </span>
          </span>
          <Switch checked={apiEnabled} onCheckedChange={setApiEnabled} />
        </label>

        <label className="flex items-start justify-between gap-4">
          <span className="flex flex-col gap-0.5">
            <span className="text-[13px] font-medium text-foreground">
              Require a handover PIN
            </span>
            <span className="text-[12px] text-muted-foreground">
              Off by default: the recipient is the partner&apos;s customer, not an Awarome
              user, so we have nobody to send a PIN to. On means the partner must relay it
              themselves.
            </span>
          </span>
          <Switch checked={requirePin} onCheckedChange={setRequirePin} />
        </label>

        <div className="flex flex-col gap-2">
          <Label htmlFor="threshold">Low-balance alert (₦)</Label>
          <Input
            id="threshold"
            type="number"
            min={0}
            step="100"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="sm:max-w-[220px]"
          />
          <p className="text-[12px] text-muted-foreground">
            We warn the partner and flag them on this dashboard below this balance. Zero
            switches the alert off — which means nobody finds out until deliveries start
            failing.
          </p>
        </div>

        <div>
          <Button size="sm" onClick={save} disabled={isPending}>
            {isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
