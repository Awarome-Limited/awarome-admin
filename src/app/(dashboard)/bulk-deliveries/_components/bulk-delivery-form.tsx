'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { BulkDropPayer, BulkPricingTerms, BulkRunSize, DeliveryAddress } from '@/lib/types';
import {
  createBulkDelivery,
  getCustomerPickups,
  quoteBulkDelivery,
  type BulkCustomer,
  type PickupSuggestion,
} from '../actions';
import { AddressInput } from './address-input';
import { CustomerPicker } from './customer-picker';
import { parseDrops } from './parse-drops';

const DEFAULT_TERMS: BulkPricingTerms = {
  minDropsForFlat: 10,
  flatRate: 2500,
  farRate: 3000,
  farDistanceKm: 25,
};

const DRAFT_KEY = 'awarome:bulk-delivery-draft:v1';

const inputClass =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive';

interface DropRow {
  id: string;
  name: string;
  phone: string;
  address: DeliveryAddress | null;
  addressQuery: string;
  payer: BulkDropPayer;
  /** '' means "use the tariff". */
  feeOverride: string;
  /** '' means "collect the fee". Receiver-pays only. */
  collect: string;
  farOverride: boolean | null;
  note: string;
}

interface FormState {
  /** Sent with the booking so a retried or doubled submit can't book twice. */
  requestKey: string;
  customer: BulkCustomer | null;
  pickup: DeliveryAddress | null;
  pickupQuery: string;
  senderName: string;
  senderPhone: string;
  vehicleType: string;
  terms: BulkPricingTerms;
  requirePin: boolean;
  autoBatch: boolean;
  fillFromPool: boolean;
  /** null until the dispatch defaults arrive with the first quote. */
  runSize: BulkRunSize | null;
  note: string;
  rows: DropRow[];
}

let rowSeq = 0;
const newRow = (patch: Partial<DropRow> = {}): DropRow => ({
  id: `row-${Date.now()}-${rowSeq++}`,
  name: '',
  phone: '',
  address: null,
  addressQuery: '',
  payer: 'vendor',
  feeOverride: '',
  collect: '',
  farOverride: null,
  note: '',
  ...patch,
});

const newRequestKey = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const emptyState = (): FormState => ({
  requestKey: newRequestKey(),
  customer: null,
  pickup: null,
  pickupQuery: '',
  senderName: '',
  senderPhone: '',
  vehicleType: 'bike',
  terms: DEFAULT_TERMS,
  requirePin: false,
  autoBatch: true,
  fillFromPool: true,
  runSize: null,
  note: '',
  rows: [newRow()],
});

const naira = (amount: number) => `₦${Math.round(amount).toLocaleString('en-NG')}`;
const pointKey = (a: DeliveryAddress) =>
  `${a.location.lat.toFixed(5)},${a.location.long.toFixed(5)}`;

type RouteQuote = { distanceKm: number; standardFee: number };

export function BulkDeliveryForm() {
  const router = useRouter();
  const [state, setState] = useState<FormState>(emptyState);
  const [pickups, setPickups] = useState<PickupSuggestion[]>([]);
  const [quotes, setQuotes] = useState<Record<string, RouteQuote>>({});
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [isQuoting, startQuote] = useTransition();
  const [isSubmitting, startSubmit] = useTransition();
  const [draft, setDraft] = useState<FormState | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  const set = (patch: Partial<FormState>) => setState((prev) => ({ ...prev, ...patch }));
  const setRow = (id: string, patch: Partial<DropRow>) =>
    setState((prev) => ({
      ...prev,
      rows: prev.rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    }));

  // ---- Draft: 18 drops typed off WhatsApp must survive a refresh. ----------
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as FormState;
      if (parsed.rows?.some((r) => r.name || r.phone || r.address || r.addressQuery)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only storage
        setDraft(parsed);
      }
    } catch {
      /* storage unavailable — the form works without it */
    }
  }, []);

  const touched =
    !!state.customer || state.rows.some((r) => r.name || r.phone || r.address || r.addressQuery);
  useEffect(() => {
    if (!touched) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
      } catch {
        /* ignore */
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [state, touched]);

  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  }

  // ---- Customer → pickup suggestions ---------------------------------------
  function chooseCustomer(customer: BulkCustomer | null) {
    set({
      customer,
      senderName: customer?.name ?? '',
      senderPhone: customer?.phone ?? '',
    });
    setPickups([]);
    if (customer) {
      getCustomerPickups(customer._id).then(setPickups);
    }
  }

  // ---- Pricing --------------------------------------------------------------
  const quoteKey = (drop: DeliveryAddress) =>
    state.pickup ? `${state.vehicleType}|${pointKey(state.pickup)}|${pointKey(drop)}` : '';

  const missing = useMemo(() => {
    if (!state.pickup) return [] as DeliveryAddress[];
    const seen = new Set<string>();
    return state.rows
      .map((r) => r.address)
      .filter((a): a is DeliveryAddress => !!a)
      .filter((a) => {
        const key = quoteKey(a);
        if (quotes[key] || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.rows, state.pickup, state.vehicleType, quotes]);

  const missingSignature = missing.map(pointKey).join(';');
  const quoteRequest = useRef(0);

  useEffect(() => {
    if (!state.pickup || !missing.length) return;
    const pickup = state.pickup;
    const vehicleType = state.vehicleType;
    const drops = missing;
    const ticket = ++quoteRequest.current;
    const timer = setTimeout(() => {
      startQuote(async () => {
        const result = await quoteBulkDelivery({
          pickupAddress: pickup,
          vehicleType,
          pricingTerms: DEFAULT_TERMS,
          drops: drops.map((dropoffAddress) => ({ dropoffAddress })),
        });
        if (ticket !== quoteRequest.current) return;
        if (!result.ok) {
          setQuoteError(result.error);
          return;
        }
        setQuoteError(null);
        // Start from the dispatch settings for this vehicle; ops can change it.
        setState((prev) => (prev.runSize ? prev : { ...prev, runSize: result.data.runSize }));
        setQuotes((prev) => {
          const next = { ...prev };
          result.data.drops.forEach((q, i) => {
            next[`${vehicleType}|${pointKey(pickup)}|${pointKey(drops[i])}`] = {
              distanceKm: q.distanceKm,
              standardFee: q.standardFee,
            };
          });
          return next;
        });
      });
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missingSignature, state.pickup, state.vehicleType]);

  const flatMode = state.rows.length >= state.terms.minDropsForFlat;

  const priced = state.rows.map((row) => {
    const quote = row.address ? quotes[quoteKey(row.address)] : undefined;
    const far = row.farOverride ?? (quote ? quote.distanceKm >= state.terms.farDistanceKm : false);
    const tariff = flatMode
      ? far
        ? state.terms.farRate
        : state.terms.flatRate
      : quote?.standardFee;
    const fee = row.feeOverride !== '' ? Number(row.feeOverride) : tariff;
    const collect =
      row.payer === 'receiver' ? (row.collect !== '' ? Number(row.collect) : fee) : undefined;
    return { row, quote, far, tariff, fee, collect };
  });

  const totals = priced.reduce(
    (t, p) => {
      const fee = p.fee ?? 0;
      t.listed += fee;
      if (p.row.payer === 'vendor') t.vendor += fee;
      else {
        t.receiverTariff += fee;
        t.collect += p.collect ?? 0;
      }
      return t;
    },
    { listed: 0, vendor: 0, receiverTariff: 0, collect: 0 }
  );
  const vendorRows = state.rows.filter((r) => r.payer === 'vendor').length;
  const receiverRows = state.rows.length - vendorRows;
  const splitDiff = totals.collect - totals.receiverTariff;
  const splitInUse = priced.some((p) => p.row.payer === 'receiver' && p.row.collect !== '');

  // ---- Rows -------------------------------------------------------------------
  function addRows(rows: DropRow[]) {
    setState((prev) => {
      // Replace the untouched starter row rather than leaving a blank drop.
      const kept = prev.rows.filter(
        (r) => r.name || r.phone || r.address || r.addressQuery || r.note
      );
      return { ...prev, rows: [...kept, ...rows] };
    });
  }

  function setAllPayers(payer: BulkDropPayer) {
    setState((prev) => ({ ...prev, rows: prev.rows.map((r) => ({ ...r, payer })) }));
  }

  // ---- Submit -----------------------------------------------------------------
  const problems: string[] = [];
  if (!state.customer) problems.push('Pick the customer these deliveries belong to.');
  if (!state.pickup) problems.push('Pick the pickup address from the suggestions.');
  if (state.autoBatch && state.runSize && state.runSize.maxDrops < state.runSize.minDrops)
    problems.push('Max drops per rider must be at least the minimum.');
  if (!state.senderName.trim() || !state.senderPhone.trim())
    problems.push('Add the sender’s name and phone for the rider.');
  priced.forEach(({ row, fee, collect }, i) => {
    const label = `Drop ${i + 1}${row.name ? ` (${row.name})` : ''}`;
    if (!row.name.trim() || !row.phone.trim()) problems.push(`${label}: receiver name and phone are required.`);
    if (!row.address) problems.push(`${label}: pick the address from the suggestions.`);
    else if (fee == null || Number.isNaN(fee)) problems.push(`${label}: still pricing — wait a moment.`);
    if (row.payer === 'receiver' && !(Number(collect) > 0))
      problems.push(`${label}: enter what the rider collects, or make it vendor-paid.`);
  });

  function submit() {
    setShowErrors(true);
    if (problems.length) {
      toast.error(problems[0]);
      return;
    }
    startSubmit(async () => {
      const result = await createBulkDelivery({
        requestKey: state.requestKey,
        userId: state.customer!._id,
        pickupAddress: state.pickup!,
        sender: { name: state.senderName.trim(), phone: state.senderPhone.trim() },
        vehicleType: state.vehicleType,
        pricingTerms: state.terms,
        note: state.note.trim() || undefined,
        requirePin: state.requirePin,
        autoBatch: state.autoBatch,
        fillFromPool: state.fillFromPool,
        runSize: state.runSize ?? { minDrops: 1, maxDrops: 5 },
        drops: priced.map(({ row, far, fee, collect }) => ({
          dropoffAddress: row.address!,
          receiver: { name: row.name.trim(), phone: row.phone.trim() },
          note: row.note.trim() || undefined,
          payer: row.payer,
          // Send exactly what ops is looking at, so the booking can't drift
          // from the screen.
          fee: Math.round(fee ?? 0),
          far,
          ...(row.payer === 'receiver' ? { amountToCollect: Math.round(collect ?? 0) } : {}),
        })),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      clearDraft();
      toast.success(`${state.rows.length} deliveries booked for ${state.customer!.name}`);
      router.push(`/bulk-deliveries/${result.data._id}`);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {draft && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-warning/40 bg-warning-bg px-4 py-3 text-[13px]">
          <span>
            You have an unsaved bulk{draft.customer ? ` for ${draft.customer.name}` : ''} with{' '}
            {draft.rows.length} {draft.rows.length === 1 ? 'drop' : 'drops'}.
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                // Drafts saved before keys existed get one now.
                setState({ ...draft, requestKey: draft.requestKey || newRequestKey() });
                setDraft(null);
                if (draft.customer) getCustomerPickups(draft.customer._id).then(setPickups);
              }}
            >
              Restore
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                clearDraft();
                setDraft(null);
              }}
            >
              Discard
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Customer & pickup</CardTitle>
            <CardDescription>The deliveries appear in this customer’s app to track.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <Label>Customer</Label>
              <CustomerPicker value={state.customer} onChange={chooseCustomer} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Pickup address</Label>
              <AddressInput
                value={state.pickup}
                query={state.pickupQuery}
                onChange={(pickup, pickupQuery) => set({ pickup, pickupQuery })}
                placeholder="Where the rider collects the packages"
              />
              {pickups.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {pickups.map((p) => (
                    <button
                      key={`${p.label}-${p.address.address}`}
                      type="button"
                      onClick={() =>
                        set({
                          pickup: p.address,
                          pickupQuery: p.address.address,
                          ...(p.sender?.name ? { senderName: p.sender.name } : {}),
                          ...(p.sender?.phone ? { senderPhone: p.sender.phone } : {}),
                        })
                      }
                      className="max-w-full truncate rounded-[8px] border border-border bg-muted/50 px-2.5 py-1 text-left text-[12px] text-foreground-secondary hover:bg-muted"
                      title={p.address.address}
                    >
                      <span className="font-semibold">{p.label}:</span> {p.address.address}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="senderName">Sender name</Label>
                <input
                  id="senderName"
                  value={state.senderName}
                  onChange={(e) => set({ senderName: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="senderPhone">Sender phone</Label>
                <input
                  id="senderPhone"
                  value={state.senderPhone}
                  onChange={(e) => set({ senderPhone: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing & options</CardTitle>
            <CardDescription>
              {flatMode
                ? `${state.rows.length} drops — flat rate applies.`
                : `Flat rate starts at ${state.terms.minDropsForFlat} drops. Until then each drop uses normal app pricing.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3.5">
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Flat rate (₦)"
                value={state.terms.flatRate}
                onChange={(flatRate) => set({ terms: { ...state.terms, flatRate } })}
              />
              <NumberField
                label="Far rate (₦)"
                value={state.terms.farRate}
                onChange={(farRate) => set({ terms: { ...state.terms, farRate } })}
              />
              <NumberField
                label="Far from (km by road)"
                value={state.terms.farDistanceKm}
                onChange={(farDistanceKm) => set({ terms: { ...state.terms, farDistanceKm } })}
              />
              <NumberField
                label="Flat rate from (drops)"
                value={state.terms.minDropsForFlat}
                onChange={(minDropsForFlat) =>
                  set({ terms: { ...state.terms, minDropsForFlat: Math.max(1, minDropsForFlat) } })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="vehicleType">Vehicle</Label>
                <select
                  id="vehicleType"
                  value={state.vehicleType}
                  onChange={(e) => set({ vehicleType: e.target.value })}
                  className={inputClass}
                >
                  <option value="bike">Bike</option>
                  <option value="car">Car</option>
                  <option value="truck">Truck</option>
                </select>
              </div>
              <label className="flex items-end justify-between gap-3 pb-1.5 text-[13px]">
                <span className="flex flex-col">
                  <span className="font-medium text-foreground">Handover PIN</span>
                  <span className="text-[11.5px] text-muted-foreground">Vendor relays a PIN per drop</span>
                </span>
                <Switch
                  checked={state.requirePin}
                  onCheckedChange={(requirePin) => set({ requirePin })}
                />
              </label>
            </div>
            <div className="flex flex-col gap-2.5 rounded-[10px] border border-border p-3">
              <label className="flex items-center justify-between gap-3 text-[13px]">
                <span className="flex flex-col">
                  <span className="font-medium text-foreground">Group into rider runs now</span>
                  <span className="text-[11.5px] text-muted-foreground">
                    Splits drops by direction from the pickup and sends each run to a rider
                  </span>
                </span>
                <Switch
                  checked={state.autoBatch}
                  onCheckedChange={(autoBatch) => set({ autoBatch })}
                />
              </label>
              {state.autoBatch && (
                <label className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="flex flex-col">
                    <span className="font-medium text-foreground">Fill spare seats with other customers’ drops</span>
                    <span className="text-[11.5px] text-muted-foreground">
                      Waiting batch drops picked up nearby and dropped along a run. Never adds a rider.
                    </span>
                  </span>
                  <Switch
                    checked={state.fillFromPool}
                    onCheckedChange={(fillFromPool) => set({ fillFromPool })}
                  />
                </label>
              )}
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="Min drops per rider"
                  value={state.runSize?.minDrops ?? NaN}
                  onChange={(minDrops) =>
                    set({ runSize: { maxDrops: state.runSize?.maxDrops ?? 5, minDrops: Math.max(1, minDrops) } })
                  }
                />
                <NumberField
                  label="Max drops per rider"
                  value={state.runSize?.maxDrops ?? NaN}
                  onChange={(maxDrops) =>
                    set({ runSize: { minDrops: state.runSize?.minDrops ?? 1, maxDrops: Math.max(1, maxDrops) } })
                  }
                />
              </div>
              {state.runSize && (
                <p className="text-[11.5px] text-muted-foreground">
                  {(() => {
                    const n = state.rows.length;
                    const runs = Math.ceil(n / Math.max(1, state.runSize.maxDrops));
                    const smallest = Math.floor(n / runs);
                    return state.autoBatch
                      ? `${n} drops → ${runs} ${runs === 1 ? 'rider' : 'riders'}, ${smallest}${
                          smallest === Math.ceil(n / runs) ? '' : `–${Math.ceil(n / runs)}`
                        } drops each.${
                          smallest < state.runSize.minDrops
                            ? ' Runs under the minimum wait in the pool for you to assign.'
                            : ''
                        }`
                      : 'Drops wait in the batch pool; assign them from the bulk page.';
                  })()}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="note">Note for every rider (optional)</Label>
              <input
                id="note"
                value={state.note}
                onChange={(e) => set({ note: e.target.value })}
                placeholder="e.g. Fragile — call receiver on arrival"
                className={inputClass}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Drops ({state.rows.length})</CardTitle>
            <CardDescription>
              {isQuoting
                ? 'Working out distances…'
                : quoteError
                  ? <span className="text-destructive">{quoteError}</span>
                  : 'Pick each address from the suggestions so riders get an exact pin.'}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <PasteDropsDialog onAdd={(rows) => addRows(rows)} />
            <Button size="sm" variant="outline" onClick={() => setAllPayers('vendor')}>
              All vendor pays
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAllPayers('receiver')}>
              All receiver pays
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border text-left text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="w-8 px-3 py-2">#</th>
                  <th className="w-[170px] px-2 py-2">Receiver</th>
                  <th className="px-2 py-2">Drop-off address</th>
                  <th className="w-[70px] px-2 py-2 text-right">Km</th>
                  <th className="w-[150px] px-2 py-2">Who pays</th>
                  <th className="w-[110px] px-2 py-2">Fee (₦)</th>
                  <th className="w-[110px] px-2 py-2">Rider collects</th>
                  <th className="w-[50px] px-2 py-2 text-center">Far</th>
                  <th className="w-[140px] px-2 py-2">Note</th>
                  <th className="w-10 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {priced.map(({ row, quote, far, tariff, fee }, i) => {
                  const err = (bad: boolean) => showErrors && bad;
                  return (
                    <tr key={row.id} className="border-b border-border align-top last:border-0">
                      <td className="px-3 py-2.5 font-semibold tabular-nums text-muted-foreground">{i + 1}</td>
                      <td className="px-2 py-2">
                        <div className="flex flex-col gap-1.5">
                          <input
                            value={row.name}
                            onChange={(e) => setRow(row.id, { name: e.target.value })}
                            placeholder="Name"
                            aria-invalid={err(!row.name.trim())}
                            className={inputClass}
                          />
                          <input
                            value={row.phone}
                            onChange={(e) => setRow(row.id, { phone: e.target.value })}
                            placeholder="Phone"
                            aria-invalid={err(!row.phone.trim())}
                            className={inputClass}
                          />
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <AddressInput
                          compact
                          value={row.address}
                          query={row.addressQuery}
                          onChange={(address, addressQuery) => setRow(row.id, { address, addressQuery })}
                        />
                        {!row.address && row.addressQuery && (
                          <p className="mt-1 text-[11.5px] text-warning">Pick a suggestion to pin this address.</p>
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground">
                        {quote ? quote.distanceKm : row.address ? '…' : '—'}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex rounded-lg border border-input p-0.5">
                          {(['vendor', 'receiver'] as const).map((payer) => (
                            <button
                              key={payer}
                              type="button"
                              onClick={() => setRow(row.id, { payer })}
                              className={cn(
                                'flex-1 rounded-md px-1.5 py-1 text-[12px] font-semibold',
                                row.payer === payer
                                  ? 'bg-brand-tint text-primary'
                                  : 'text-muted-foreground hover:text-foreground'
                              )}
                            >
                              {payer === 'vendor' ? 'Vendor' : 'Receiver'}
                            </button>
                          ))}
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {row.payer === 'vendor' ? 'Pays after delivery' : 'Pays rider at the door'}
                        </p>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={0}
                          value={row.feeOverride}
                          onChange={(e) => setRow(row.id, { feeOverride: e.target.value })}
                          placeholder={tariff != null ? String(tariff) : '…'}
                          className={cn(inputClass, 'tabular-nums')}
                        />
                        {row.feeOverride !== '' && tariff != null && Number(row.feeOverride) !== tariff && (
                          <button
                            type="button"
                            onClick={() => setRow(row.id, { feeOverride: '' })}
                            className="mt-1 text-[11px] text-primary hover:underline"
                          >
                            Reset to {naira(tariff)}
                          </button>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {row.payer === 'receiver' ? (
                          <input
                            type="number"
                            min={0}
                            value={row.collect}
                            onChange={(e) => setRow(row.id, { collect: e.target.value })}
                            placeholder={fee != null ? String(fee) : '…'}
                            aria-invalid={err(row.collect !== '' && !(Number(row.collect) > 0))}
                            className={cn(inputClass, 'tabular-nums')}
                          />
                        ) : (
                          <span className="block px-1 py-1.5 text-[12px] text-muted-foreground">Nothing</span>
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={far}
                          disabled={!flatMode}
                          onChange={(e) => setRow(row.id, { farOverride: e.target.checked })}
                          title={flatMode ? 'Charge the far rate' : 'Far rate only applies to flat-rate bulks'}
                          className="size-4 accent-[var(--primary)]"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          value={row.note}
                          onChange={(e) => setRow(row.id, { note: e.target.value })}
                          placeholder="Optional"
                          className={inputClass}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() =>
                            setState((prev) => ({
                              ...prev,
                              rows: prev.rows.length > 1 ? prev.rows.filter((r) => r.id !== row.id) : [newRow()],
                            }))
                          }
                          aria-label={`Remove drop ${i + 1}`}
                          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"
                        >
                          <Trash2Icon className="size-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 pt-3">
            <Button size="sm" variant="outline" onClick={() => addRows([newRow()])}>
              <PlusIcon data-icon="inline-start" />
              Add drop
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Total label="Total fees" value={naira(totals.listed)} hint={`${state.rows.length} drops`} />
            <Total
              label="Vendor owes after delivery"
              value={naira(totals.vendor)}
              hint={`${vendorRows} ${vendorRows === 1 ? 'drop' : 'drops'}`}
            />
            <Total
              label="Riders collect at the door"
              value={naira(totals.collect)}
              hint={`${receiverRows} ${receiverRows === 1 ? 'drop' : 'drops'}`}
            />
            <Total
              label="Vendor’s split vs tariff"
              value={
                !splitInUse ? '—' : splitDiff === 0 ? 'Balanced' : `${splitDiff > 0 ? '+' : '−'}${naira(Math.abs(splitDiff))}`
              }
              hint={splitInUse ? `Tariff ${naira(totals.receiverTariff)} on receiver drops` : 'No custom split'}
              tone={splitInUse && splitDiff !== 0 ? 'warning' : undefined}
            />
          </div>
          {splitInUse && splitDiff !== 0 && (
            <p className="rounded-[10px] bg-warning-bg px-3 py-2 text-[12.5px] text-foreground">
              Riders will collect {naira(totals.collect)} but the receiver drops are priced at{' '}
              {naira(totals.receiverTariff)}. Each drop is billed at what its rider collects, so this
              bulk will total {naira(totals.vendor + totals.collect)}. Check the split with the vendor.
            </p>
          )}
          {showErrors && problems.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5 text-[12.5px] text-destructive">
              {problems.slice(0, 6).map((p) => (
                <li key={p}>{p}</li>
              ))}
              {problems.length > 6 && <li>…and {problems.length - 6} more</li>}
            </ul>
          )}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                clearDraft();
                setState(emptyState());
                setPickups([]);
                setShowErrors(false);
              }}
              disabled={isSubmitting}
            >
              Clear form
            </Button>
            <Button onClick={submit} disabled={isSubmitting || isQuoting}>
              {isSubmitting
                ? 'Booking…'
                : `Book ${state.rows.length} ${state.rows.length === 1 ? 'delivery' : 'deliveries'}`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <input
        type="number"
        min={0}
        value={Number.isFinite(value) ? value : ''}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(inputClass, 'tabular-nums')}
      />
    </div>
  );
}

function Total({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'warning';
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[12px] border border-border bg-card p-[11px_14px]">
      <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
      <span className={cn('text-[18px] font-bold tabular-nums', tone === 'warning' ? 'text-warning' : 'text-foreground')}>
        {value}
      </span>
      {hint && <span className="text-[11.5px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

function PasteDropsDialog({ onAdd }: { onAdd: (rows: DropRow[]) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const parsed = useMemo(() => parseDrops(text), [text]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Paste from WhatsApp</DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Paste the vendor’s list</DialogTitle>
          <DialogDescription>
            One drop per line (“Ada, 0803…, 12 Aminu Kano Cres”), or blocks separated by a blank
            line. You’ll still pick each address from the suggestions.
          </DialogDescription>
        </DialogHeader>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder={'Name: Ada Obi\nPhone: 0803 123 4567\nAddress: 12 Aminu Kano Crescent, Wuse 2\n\nMusa Bello, 07012345678, Kubwa Phase 4'}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 font-mono text-[12.5px] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        {parsed.length > 0 && (
          <div className="max-h-[180px] overflow-y-auto rounded-lg border border-border text-[12px]">
            {parsed.map((d, i) => (
              <div key={i} className="flex gap-2 border-b border-border px-2.5 py-1.5 last:border-0">
                <span className="w-5 shrink-0 text-muted-foreground">{i + 1}</span>
                <span className={cn('w-28 shrink-0 truncate', !d.name && 'text-destructive')}>{d.name || 'no name'}</span>
                <span className={cn('w-28 shrink-0 tabular-nums', !d.phone && 'text-destructive')}>{d.phone || 'no phone'}</span>
                <span className={cn('min-w-0 truncate', !d.address && 'text-destructive')}>{d.address || 'no address'}</span>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!parsed.length}
            onClick={() => {
              onAdd(parsed.map((d) => newRow({ name: d.name, phone: d.phone, addressQuery: d.address })));
              setText('');
              setOpen(false);
            }}
          >
            Add {parsed.length || ''} {parsed.length === 1 ? 'drop' : 'drops'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
