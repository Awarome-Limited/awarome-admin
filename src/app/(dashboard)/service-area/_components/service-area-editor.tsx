'use client';

import { PageHeader, PageStack } from '@/components/page';
import { SaveBar } from '@/components/save-bar';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { ServiceAreaConfig, ServiceAreaPlace, ServiceAreaState } from '@/lib/types';
import { updateServiceArea } from '../actions';

// Inputs are edited as raw strings and parsed on save.
interface StateRow {
  name: string;
  aliases: string;
  minLat: string;
  maxLat: string;
  minLng: string;
  maxLng: string;
  active: boolean;
}

interface PlaceRow {
  name: string;
  keywords: string;
  lat: string;
  lng: string;
  radiusKm: string;
  active: boolean;
}

const str = (n: number | undefined | null) => (n == null ? '' : String(n));
const words = (value: string) =>
  value
    .split(',')
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean);

const toStateRows = (states: ServiceAreaState[]): StateRow[] =>
  states.map((s) => ({
    name: s.name,
    aliases: s.aliases.join(', '),
    minLat: str(s.bounds?.minLat),
    maxLat: str(s.bounds?.maxLat),
    minLng: str(s.bounds?.minLng),
    maxLng: str(s.bounds?.maxLng),
    active: s.active,
  }));

const toPlaceRows = (places: ServiceAreaPlace[]): PlaceRow[] =>
  places.map((p) => ({
    name: p.name,
    keywords: p.keywords.join(', '),
    lat: str(p.lat),
    lng: str(p.lng),
    radiusKm: str(p.radiusKm),
    active: p.active,
  }));

const inputClass =
  'field-area w-full';
const cardClass = 'rounded-[10px] border border-border bg-card px-6 py-5';

function Input({
  label,
  value,
  onChange,
  placeholder,
  numeric,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  numeric?: boolean;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-[7px] ${className ?? ''}`}>
      <span className="text-[13.5px] font-medium text-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={numeric ? 'decimal' : undefined}
        className={`${inputClass} ${numeric ? 'tabular-nums' : ''}`}
      />
    </label>
  );
}

function RowFooter({
  active,
  onActive,
  onRemove,
}: {
  active: boolean;
  onActive: (active: boolean) => void;
  onRemove: () => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between">
      <label className="flex items-center gap-2 text-[13.5px] font-medium text-foreground">
        <Switch checked={active} onCheckedChange={onActive} />
        {active ? 'Active' : 'Inactive'}
      </label>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full px-[12px] py-[7px] text-[13px] font-semibold text-destructive transition-colors hover:bg-destructive/10"
      >
        Remove
      </button>
    </div>
  );
}

export function ServiceAreaEditor({ config }: { config: ServiceAreaConfig }) {
  const [states, setStates] = useState<StateRow[]>(toStateRows(config.states));
  const [places, setPlaces] = useState<PlaceRow[]>(toPlaceRows(config.extraPlaces));
  const [message, setMessage] = useState(config.outsideMessage);
  const [isPending, startTransition] = useTransition();
  // What the API last stored, to drive the floating save bar and Discard.
  const snapshot = JSON.stringify({ states, places, message });
  const [saved, setSaved] = useState(snapshot);
  const dirty = snapshot !== saved;
  function discard() {
    const s = JSON.parse(saved);
    setStates(s.states); setPlaces(s.places); setMessage(s.message);
  }

  const patchState = (i: number, patch: Partial<StateRow>) =>
    setStates((prev) => prev.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  const patchPlace = (i: number, patch: Partial<PlaceRow>) =>
    setPlaces((prev) => prev.map((row, j) => (j === i ? { ...row, ...patch } : row)));

  function handleSave() {
    const outStates: ServiceAreaState[] = [];
    for (const row of states) {
      const name = row.name.trim();
      if (!name) return toast.error('Every state needs a name.');
      const raw = [row.minLat, row.maxLat, row.minLng, row.maxLng].map((v) => v.trim());
      let bounds: ServiceAreaState['bounds'] = null;
      if (raw.some(Boolean)) {
        const [minLat, maxLat, minLng, maxLng] = raw.map(Number);
        if (raw.some((v) => !v) || [minLat, maxLat, minLng, maxLng].some((n) => !Number.isFinite(n))) {
          return toast.error(`Fill in all four bounds for ${name}, or leave them all empty.`);
        }
        if (minLat >= maxLat || minLng >= maxLng) {
          return toast.error(`${name}: each minimum must be below its maximum.`);
        }
        bounds = { minLat, maxLat, minLng, maxLng };
      }
      outStates.push({ name, aliases: words(row.aliases), bounds, active: row.active });
    }

    const outPlaces: ServiceAreaPlace[] = [];
    for (const row of places) {
      const name = row.name.trim();
      if (!name) return toast.error('Every extra place needs a name.');
      const lat = Number(row.lat);
      const lng = Number(row.lng);
      const radiusKm = Number(row.radiusKm);
      if (!row.lat.trim() || !row.lng.trim() || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        return toast.error(`Enter the centre of ${name} as latitude and longitude.`);
      }
      if (!Number.isFinite(radiusKm) || radiusKm <= 0) {
        return toast.error(`Enter a radius for ${name}.`);
      }
      outPlaces.push({ name, keywords: words(row.keywords), lat, lng, radiusKm, active: row.active });
    }

    if (![...outStates, ...outPlaces].some((a) => a.active)) {
      return toast.error('Keep at least one area active, or nobody can book a delivery.');
    }
    if (!message.trim()) return toast.error('Add the message people see outside the area.');

    startTransition(async () => {
      try {
        await updateServiceArea({ states: outStates, extraPlaces: outPlaces, outsideMessage: message.trim() });
        setSaved(snapshot);
        toast.success('Service area saved.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save the service area.');
      }
    });
  }

  return (
    <PageStack>
      <PageHeader title="Service area" subtitle={<>Where Awarome Business delivers to and picks up from. Addresses anywhere else can&rsquo;t be booked. Changes apply within 30 seconds.</>} />

      <div className="flex flex-col gap-6" >
        <section className="flex flex-col gap-3">
          <div>
            <div className="font-heading text-[17px] font-bold tracking-[-0.03em] text-foreground">States</div>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Matched on the state Google gives an address. Bounds (optional) stop an address elsewhere
              passing on the state&rsquo;s name alone.
            </p>
          </div>
          {states.map((row, i) => (
            <div key={i} className={cardClass}>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input className="flex-1" label="State" value={row.name} onChange={(name) => patchState(i, { name })} placeholder="Federal Capital Territory" />
                <Input className="flex-1" label="Also known as (comma-separated)" value={row.aliases} onChange={(aliases) => patchState(i, { aliases })} placeholder="fct, abuja" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Input numeric label="Min latitude" value={row.minLat} onChange={(minLat) => patchState(i, { minLat })} />
                <Input numeric label="Max latitude" value={row.maxLat} onChange={(maxLat) => patchState(i, { maxLat })} />
                <Input numeric label="Min longitude" value={row.minLng} onChange={(minLng) => patchState(i, { minLng })} />
                <Input numeric label="Max longitude" value={row.maxLng} onChange={(maxLng) => patchState(i, { maxLng })} />
              </div>
              <RowFooter
                active={row.active}
                onActive={(active) => patchState(i, { active })}
                onRemove={() => setStates((prev) => prev.filter((_, j) => j !== i))}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setStates((prev) => [...prev, { name: '', aliases: '', minLat: '', maxLat: '', minLng: '', maxLng: '', active: true }])}
            className="self-start rounded-[10px] border border-dashed border-border px-[16px] py-[10px] text-[13px] font-semibold text-foreground-secondary transition-colors hover:bg-muted"
          >
            + Add state
          </button>
        </section>

        <section className="flex flex-col gap-3">
          <div>
            <div className="font-heading text-[17px] font-bold tracking-[-0.03em] text-foreground">Extra places</div>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Towns outside those states that we still serve. An address counts if it&rsquo;s within the
              radius of the centre, or names the place and is close by.
            </p>
          </div>
          {places.map((row, i) => (
            <div key={i} className={cardClass}>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input className="flex-1" label="Place" value={row.name} onChange={(name) => patchPlace(i, { name })} placeholder="Mararaba" />
                <Input className="flex-[2]" label="Match keywords (comma-separated)" value={row.keywords} onChange={(keywords) => patchPlace(i, { keywords })} placeholder="mararaba" />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <Input numeric label="Centre latitude" value={row.lat} onChange={(lat) => patchPlace(i, { lat })} />
                <Input numeric label="Centre longitude" value={row.lng} onChange={(lng) => patchPlace(i, { lng })} />
                <Input numeric label="Radius (km)" value={row.radiusKm} onChange={(radiusKm) => patchPlace(i, { radiusKm })} />
              </div>
              <RowFooter
                active={row.active}
                onActive={(active) => patchPlace(i, { active })}
                onRemove={() => setPlaces((prev) => prev.filter((_, j) => j !== i))}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setPlaces((prev) => [...prev, { name: '', keywords: '', lat: '', lng: '', radiusKm: '3', active: true }])}
            className="self-start rounded-[10px] border border-dashed border-border px-[16px] py-[10px] text-[13px] font-semibold text-foreground-secondary transition-colors hover:bg-muted"
          >
            + Add place
          </button>
        </section>

        <section className={cardClass}>
          <label className="flex flex-col gap-[7px]">
            <span className="font-heading text-[17px] font-bold tracking-[-0.03em] text-foreground">Message outside the area</span>
            <span className="text-[13px] text-muted-foreground">
              What a business sees when they pick an address we don&rsquo;t serve.
            </span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              maxLength={300}
              className={`${inputClass} mt-1 resize-y`}
            />
          </label>
        </section>
      </div>
      <SaveBar dirty={dirty} saving={isPending} label="Unsaved service area changes" onDiscard={discard} onSave={handleSave} />
    </PageStack>
  );
}
