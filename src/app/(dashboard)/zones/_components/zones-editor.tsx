'use client';

import { PageHeader, PageStack } from '@/components/page';
import { SaveBar } from '@/components/save-bar';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { DeliveryZone, DeliveryZoneConfig } from '@/lib/types';
import { updateDeliveryZones } from '../actions';

interface ZoneRow {
  name: string;
  // Kept as the raw comma-separated string while editing; split on save.
  keywords: string;
  active: boolean;
}

function toRows(zones: DeliveryZone[]): ZoneRow[] {
  return zones.map((zone) => ({
    name: zone.name,
    keywords: zone.keywords.join(', '),
    active: zone.active,
  }));
}

export function ZonesEditor({ config }: { config: DeliveryZoneConfig }) {
  const [rows, setRows] = useState<ZoneRow[]>(toRows(config.zones));
  const [isPending, startTransition] = useTransition();
  // What the API last stored, to drive the floating save bar and Discard.
  const snapshot = JSON.stringify({ rows });
  const [saved, setSaved] = useState(snapshot);
  const dirty = snapshot !== saved;
  function discard() {
    const s = JSON.parse(saved);
    setRows(s.rows);
  }

  function updateRow(index: number, patch: Partial<ZoneRow>) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  function addRow() {
    setRows((prev) => [...prev, { name: '', keywords: '', active: true }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    const zones: DeliveryZone[] = [];
    for (const row of rows) {
      const name = row.name.trim();
      if (!name) {
        toast.error('Every zone needs a name.');
        return;
      }
      const keywords = row.keywords
        .split(',')
        .map((keyword) => keyword.trim().toLowerCase())
        .filter((keyword) => keyword.length > 0);
      if (!keywords.length) {
        toast.error(`Add at least one keyword for "${name}".`);
        return;
      }
      zones.push({ name, keywords, active: row.active });
    }

    const activeCount = zones.filter((zone) => zone.active).length;
    if (activeCount === 0 && zones.length > 0) {
      toast.error(
        'At least one zone must be active, or batch delivery is disabled everywhere.'
      );
      return;
    }

    startTransition(async () => {
      try {
        await updateDeliveryZones({ zones });
        setSaved(snapshot);
        toast.success('Delivery zones saved.');
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to save delivery zones.'
        );
      }
    });
  }

  return (
    <PageStack>
      <PageHeader title="Delivery zones" subtitle={<>Batch delivery pickups are restricted to these zones. Instant delivery is not. Changes apply immediately to new quotes.</>} />

      <div
        className="flex flex-col gap-3"
        
      >
        {rows.length === 0 && (
          <div className="rounded-[10px] border border-dashed border-border bg-card p-[22px_24px] text-[13px] text-muted-foreground">
            No zones yet. Add one below — until then, batch delivery is
            unavailable everywhere.
          </div>
        )}

        {rows.map((row, index) => (
          <div
            key={index}
            className="rounded-[10px] border border-border bg-card px-6 py-5"
          >
            <div className="flex items-start gap-4">
              <div className="flex flex-1 flex-col gap-3 sm:flex-row">
                <div className="flex flex-1 flex-col gap-[7px]">
                  <span className="text-[13.5px] font-medium text-foreground">
                    Zone name
                  </span>
                  <input
                    value={row.name}
                    onChange={(e) => updateRow(index, { name: e.target.value })}
                    placeholder="Wuse"
                    className="field w-full font-semibold"
                  />
                </div>
                <div className="flex flex-[2] flex-col gap-[7px]">
                  <span className="text-[13.5px] font-medium text-foreground">
                    Match keywords (comma-separated)
                  </span>
                  <input
                    value={row.keywords}
                    onChange={(e) =>
                      updateRow(index, { keywords: e.target.value })
                    }
                    placeholder="wuse, wuse 2, wuse zone"
                    className="field w-full"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <label className="flex items-center gap-2 text-[13.5px] font-medium text-foreground">
                <Switch
                  checked={row.active}
                  onCheckedChange={(active) => updateRow(index, { active })}
                />
                {row.active ? 'Active' : 'Inactive'}
              </label>
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="rounded-full px-[12px] py-[7px] text-[13px] font-semibold text-destructive transition-colors hover:bg-destructive/10"
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addRow}
          className="self-start rounded-[10px] border border-dashed border-border px-[16px] py-[10px] text-[13px] font-semibold text-foreground-secondary transition-colors hover:bg-muted"
        >
          + Add zone
        </button>
      </div>
      <SaveBar dirty={dirty} saving={isPending} label="Unsaved zone changes" onDiscard={discard} onSave={handleSave} />
    </PageStack>
  );
}
