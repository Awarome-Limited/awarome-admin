'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Field, Panel } from '@/components/page';
import { SaveBar } from '@/components/save-bar';
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

  const dirty =
    apiEnabled !== Boolean(partner.apiEnabled) ||
    requirePin !== Boolean(partner.defaultRequirePin) ||
    threshold !== koboToNaira(partner.lowBalanceThreshold);

  function discard() {
    setApiEnabled(Boolean(partner.apiEnabled));
    setRequirePin(Boolean(partner.defaultRequirePin));
    setThreshold(koboToNaira(partner.lowBalanceThreshold));
  }

  return (
    <Panel title="API access" description="Controls the delivery API for this partner.">
      <label className="flex items-start justify-between gap-4">
        <span className="flex flex-col gap-1">
          <span className="text-[13.5px] font-medium">Enable the API</span>
          <span className="text-[12.5px] text-muted-foreground">
            Off means every call is refused, whatever keys exist.
          </span>
        </span>
        <Switch checked={apiEnabled} onCheckedChange={setApiEnabled} />
      </label>

      <label className="flex items-start justify-between gap-4">
        <span className="flex flex-col gap-1">
          <span className="text-[13.5px] font-medium">Require a handover PIN</span>
          <span className="text-[12.5px] text-muted-foreground">
            Off by default: the recipient is the partner&apos;s customer, not an Awarome user, so we have nobody
            to send a PIN to. On means the partner must relay it themselves.
          </span>
        </span>
        <Switch checked={requirePin} onCheckedChange={setRequirePin} />
      </label>

      <Field
        label="Low-balance alert"
        htmlFor="threshold"
        help="We warn the partner and flag them on this dashboard below this balance. Zero switches the alert off, so nobody finds out until deliveries start failing."
      >
        <div className="field-wrap sm:max-w-[220px]">
          <span>₦</span>
          <input
            id="threshold"
            type="number"
            min={0}
            step="100"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="w-full border-0 bg-transparent text-foreground tabular-nums outline-none"
          />
        </div>
      </Field>

      <SaveBar dirty={dirty} saving={isPending} label="Unsaved API access changes" onDiscard={discard} onSave={save} />
    </Panel>
  );
}
