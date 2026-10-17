'use client';

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  CheckIcon,
  ClipboardPasteIcon,
  LayersIcon,
  PlusIcon,
  RouteIcon,
  SearchIcon,
  SplitIcon,
  Trash2Icon,
  UserCheckIcon,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Field, FieldGrid, InlineNotice, ListCard, Panel } from '@/components/page';
import { StatStrip } from '@/components/stat-strip';
import { segmentItem, segmentTrack } from '@/components/segmented';
import { formatPhone, humanize } from '@/lib/format';
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
import type {
  AdminRider,
  BulkDispatchMode,
  BulkDropPayer,
  BulkPricingTerms,
  BulkRunSize,
  DeliveryAddress,
} from '@/lib/types';
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
import { SavedAddressMenu } from './saved-address-menu';
import { startNavigationProgress } from '@/components/navigation-progress';
import { Spinner } from '@/components/ui/spinner';

const DEFAULT_TERMS: BulkPricingTerms = {
  minDropsForFlat: 10,
  flatRate: 2500,
  farRate: 3000,
  farDistanceKm: 25,
};

const DRAFT_KEY = 'awarome:bulk-delivery-draft:v1';

const inputClass = 'field';
/** Denser inputs inside the drops table. */
const cellInput = 'field h-9 px-2.5 text-[13.5px]';

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
  dispatchMode: BulkDispatchMode;
  /** For the `rider` mode. */
  riderId: string;
  /** Runs mode only. */
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
  dispatchMode: 'runs',
  riderId: '',
  fillFromPool: true,
  runSize: null,
  note: '',
  rows: [newRow()],
});

const naira = (amount: number) => `₦ ${Math.round(amount).toLocaleString('en-NG')}`;
const pointKey = (a: DeliveryAddress) =>
  `${a.location.lat.toFixed(5)},${a.location.long.toFixed(5)}`;

type RouteQuote = { distanceKm: number; standardFee: number };

const DISPATCH_OPTIONS: {
  value: BulkDispatchMode;
  title: string;
  hint: string;
  icon: LucideIcon;
}[] = [
  {
    value: 'runs',
    title: 'Split across riders',
    hint: 'Cut into runs by direction; each run goes to a different rider.',
    icon: SplitIcon,
  },
  {
    value: 'single-trip',
    title: 'One trip, open to riders',
    hint: 'Every drop on one run. The first rider nearby to accept takes it all.',
    icon: RouteIcon,
  },
  {
    value: 'rider',
    title: 'One trip, to a rider I pick',
    hint: 'Every drop on one run, handed straight to the rider you choose.',
    icon: UserCheckIcon,
  },
  {
    value: 'pool',
    title: 'Normal batching',
    hint: 'Drops join the batch pool and group with app orders going the same way.',
    icon: LayersIcon,
  },
];

/** Drafts saved before dispatch was a choice carried `autoBatch` instead. */
function migrateDraft(draft: FormState & { autoBatch?: boolean }): FormState {
  const { autoBatch, ...rest } = draft;
  return {
    ...rest,
    dispatchMode: draft.dispatchMode ?? (autoBatch === false ? 'pool' : 'runs'),
    riderId: draft.riderId ?? '',
    requestKey: draft.requestKey || newRequestKey(),
  };
}

export function BulkDeliveryForm({ riders }: { riders: AdminRider[] }) {
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

  const pickedRider = riders.find((r) => r._id === state.riderId);
  const dispatchSummary = {
    runs: state.runSize
      ? `Split across ${Math.ceil(state.rows.length / Math.max(1, state.runSize.maxDrops))} rider runs`
      : 'Split across riders',
    'single-trip': 'One trip, offered to riders nearby',
    rider: pickedRider ? `One trip, assigned to ${riderName(pickedRider)}` : 'One trip — pick the rider',
    pool: 'Normal batching with app orders',
  }[state.dispatchMode];

  // ---- Submit -----------------------------------------------------------------
  const problems: string[] = [];
  if (!state.customer) problems.push('Pick the customer these deliveries belong to.');
  if (!state.pickup) problems.push('Pick the pickup address from the suggestions.');
  if (state.dispatchMode === 'runs' && state.runSize && state.runSize.maxDrops < state.runSize.minDrops)
    problems.push('Max drops per rider must be at least the minimum.');
  if (state.dispatchMode === 'rider' && !state.riderId)
    problems.push('Pick the rider taking this bulk.');
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
        dispatchMode: state.dispatchMode,
        ...(state.dispatchMode === 'rider' ? { riderId: state.riderId } : {}),
        fillFromPool: state.dispatchMode === 'runs' && state.fillFromPool,
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
      if (result.data.message.startsWith('Bulk booked, but')) {
        toast.warning(result.data.message, { duration: 12000 });
      } else {
        toast.success(`${state.rows.length} deliveries booked for ${state.customer!.name}`);
      }
      startNavigationProgress();
      router.push(`/bulk-deliveries/${result.data._id}`);
    });
  }

  const bookLabel = `Book ${state.rows.length} ${state.rows.length === 1 ? 'delivery' : 'deliveries'}`;

  return (
    <div className="flex flex-col gap-7">
      {draft && (
        <InlineNotice
          tone="info"
          action={
            <span className="flex gap-3">
              <button
                type="button"
                className="font-medium text-primary hover:text-warning"
                onClick={() => {
                  setState(migrateDraft(draft));
                  setDraft(null);
                  if (draft.customer) getCustomerPickups(draft.customer._id).then(setPickups);
                }}
              >
                Restore
              </button>
              <button
                type="button"
                className="font-medium text-foreground-secondary hover:text-foreground"
                onClick={() => {
                  clearDraft();
                  setDraft(null);
                }}
              >
                Discard
              </button>
            </span>
          }
        >
          You have an unsaved bulk{draft.customer ? ` for ${draft.customer.name}` : ''} with {draft.rows.length}{' '}
          {draft.rows.length === 1 ? 'drop' : 'drops'}.
        </InlineNotice>
      )}

      <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Panel title="Customer and pickup" description="The deliveries appear in this customer’s app to track.">
          <Field label="Customer">
            <CustomerPicker value={state.customer} onChange={chooseCustomer} />
          </Field>
          <div className="flex flex-col gap-2">
            <div className="flex min-h-7 items-center justify-between gap-2">
              <span className="text-[13.5px] font-medium">Pickup address</span>
              <SavedAddressMenu
                options={pickups}
                value={state.pickup}
                onPick={(p) =>
                  set({
                    pickup: p.address,
                    pickupQuery: p.address.address,
                    ...(p.sender?.name ? { senderName: p.sender.name } : {}),
                    ...(p.sender?.phone ? { senderPhone: p.sender.phone } : {}),
                  })
                }
              />
            </div>
            <AddressInput
              value={state.pickup}
              query={state.pickupQuery}
              onChange={(pickup, pickupQuery) => set({ pickup, pickupQuery })}
              placeholder={pickups.length ? 'Search, or choose from saved addresses' : 'Where the rider collects the packages'}
            />
          </div>
          <FieldGrid>
            <Field label="Sender name" htmlFor="senderName" help="Who the rider meets at pickup.">
              <input
                id="senderName"
                value={state.senderName}
                onChange={(e) => set({ senderName: e.target.value })}
                aria-invalid={showErrors && !state.senderName.trim()}
                className={inputClass}
              />
            </Field>
            <Field label="Sender phone" htmlFor="senderPhone">
              <input
                id="senderPhone"
                value={state.senderPhone}
                onChange={(e) => set({ senderPhone: e.target.value })}
                aria-invalid={showErrors && !state.senderPhone.trim()}
                className={cn(inputClass, 'tabular-nums')}
              />
            </Field>
          </FieldGrid>
        </Panel>

        <Panel
          title="Pricing"
          description={
            flatMode
              ? `${state.rows.length} drops, so the flat rate applies.`
              : `The flat rate starts at ${state.terms.minDropsForFlat} drops. Until then each drop uses normal app pricing.`
          }
          aside={<Badge variant={flatMode ? 'info' : 'secondary'}>{flatMode ? 'Flat rate' : 'App pricing'}</Badge>}
        >
          <FieldGrid>
            <NumberField
              label="Flat rate"
              unit="₦"
              value={state.terms.flatRate}
              onChange={(flatRate) => set({ terms: { ...state.terms, flatRate } })}
            />
            <NumberField
              label="Far rate"
              unit="₦"
              value={state.terms.farRate}
              onChange={(farRate) => set({ terms: { ...state.terms, farRate } })}
            />
            <NumberField
              label="Far from"
              unit="km"
              help="By road, from the pickup."
              value={state.terms.farDistanceKm}
              onChange={(farDistanceKm) => set({ terms: { ...state.terms, farDistanceKm } })}
            />
            <NumberField
              label="Flat rate from"
              unit="#"
              help="Drops in the bulk."
              value={state.terms.minDropsForFlat}
              onChange={(minDropsForFlat) => set({ terms: { ...state.terms, minDropsForFlat: Math.max(1, minDropsForFlat) } })}
            />
          </FieldGrid>
          <div className="flex flex-col gap-2">
            <span className="text-[13.5px] font-medium">Vehicle</span>
            <div className={segmentTrack}>
              {(['bike', 'car', 'truck'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => set({ vehicleType: v, riderId: '' })}
                  className={segmentItem(state.vehicleType === v, 'sm')}
                >
                  {v[0].toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-start justify-between gap-4">
            <span className="flex flex-col gap-1">
              <span className="text-[13.5px] font-medium">Handover PIN</span>
              <span className="text-[12.5px] text-muted-foreground">The vendor relays a PIN per drop to each receiver.</span>
            </span>
            <Switch checked={state.requirePin} onCheckedChange={(requirePin) => set({ requirePin })} />
          </label>
          <Field label="Note for every rider" htmlFor="note" help="Optional.">
            <input
              id="note"
              value={state.note}
              onChange={(e) => set({ note: e.target.value })}
              placeholder="e.g. Fragile, call the receiver on arrival"
              className={inputClass}
            />
          </Field>
        </Panel>
      </section>

      <Panel title="Dispatch" description={`How these ${state.rows.length} drops reach riders once booked.`}>
        <div role="radiogroup" aria-label="Dispatch" className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {DISPATCH_OPTIONS.map((option) => {
            const active = state.dispatchMode === option.value;
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => set({ dispatchMode: option.value })}
                className={cn(
                  'flex gap-3 rounded-[8px] p-3.5 text-left transition-colors',
                  active
                    ? 'border-[1.5px] border-primary bg-brand-tint'
                    : 'border border-border bg-card hover:border-muted-foreground'
                )}
              >
                <span
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-[8px]',
                    active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}
                >
                  <Icon className="size-[18px]" />
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="text-[14px] font-medium">{option.title}</span>
                  <span className={cn('text-[12.5px] leading-[1.5]', active ? 'text-foreground-secondary' : 'text-muted-foreground')}>
                    {option.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="border-t border-border pt-[18px]">
          {state.dispatchMode === 'runs' && (
            <div className="flex flex-col gap-4">
              <FieldGrid>
                <NumberField
                  label="Min drops per rider"
                  unit="#"
                  value={state.runSize?.minDrops ?? NaN}
                  onChange={(minDrops) =>
                    set({ runSize: { maxDrops: state.runSize?.maxDrops ?? 5, minDrops: Math.max(1, minDrops) } })
                  }
                />
                <NumberField
                  label="Max drops per rider"
                  unit="#"
                  value={state.runSize?.maxDrops ?? NaN}
                  onChange={(maxDrops) =>
                    set({ runSize: { minDrops: state.runSize?.minDrops ?? 1, maxDrops: Math.max(1, maxDrops) } })
                  }
                />
              </FieldGrid>
              <label className="flex items-start justify-between gap-4">
                <span className="flex flex-col gap-1">
                  <span className="text-[13.5px] font-medium">Fill spare seats with other customers’ drops</span>
                  <span className="text-[12.5px] text-muted-foreground">
                    Picked up nearby and dropped along a run. Never adds a rider.
                  </span>
                </span>
                <Switch checked={state.fillFromPool} onCheckedChange={(fillFromPool) => set({ fillFromPool })} />
              </label>
              {state.runSize && <DispatchNote>{runsPreview(state.rows.length, state.runSize)}</DispatchNote>}
            </div>
          )}
          {state.dispatchMode === 'single-trip' && (
            <DispatchNote>
              All {state.rows.length} drops go out as one run, offered to {state.vehicleType} riders near the pickup. The
              first to accept takes the whole trip. Nobody else’s drops are added.
            </DispatchNote>
          )}
          {state.dispatchMode === 'rider' && (
            <RiderPicker
              riders={riders}
              vehicleType={state.vehicleType}
              value={state.riderId}
              onChange={(riderId) => set({ riderId })}
              invalid={showErrors && !state.riderId}
              drops={state.rows.length}
            />
          )}
          {state.dispatchMode === 'pool' && (
            <DispatchNote>
              Nothing is sent yet. The drops wait in the batch pool and group with app orders heading the same way, as
              normal batch deliveries do. You can still assign them from the bulk page.
            </DispatchNote>
          )}
        </div>
      </Panel>

      <ListCard
        title={`Drops (${state.rows.length})`}
        description={
          isQuoting ? (
            'Working out distances…'
          ) : quoteError ? (
            <span className="text-destructive">{quoteError}</span>
          ) : (
            'Pick each address from the suggestions so riders get an exact pin.'
          )
        }
        aside={
          <div className="flex flex-wrap items-center gap-2.5">
            <div className={segmentTrack} aria-label="Set who pays for every drop">
              <button type="button" onClick={() => setAllPayers('vendor')} className={segmentItem(receiverRows === 0, 'sm')}>
                All vendor pays
              </button>
              <button type="button" onClick={() => setAllPayers('receiver')} className={segmentItem(vendorRows === 0, 'sm')}>
                All receiver pays
              </button>
            </div>
            <PasteDropsDialog onAdd={(rows) => addRows(rows)} />
          </div>
        }
        footer={
          <Button variant="outline" size="sm" onClick={() => addRows([newRow()])}>
            <PlusIcon />
            Add drop
          </Button>
        }
      >
        <table className="w-full min-w-[1080px] border-collapse text-[14px]">
          <thead>
            <tr className="border-b border-border text-left text-[11.5px] font-medium tracking-[0.06em] text-muted-foreground uppercase">
              <th className="h-11 w-10 pr-2 pl-6">#</th>
              <th className="w-[180px] px-2">Receiver</th>
              <th className="px-2">Drop-off address</th>
              <th className="w-[64px] px-2 text-right">Km</th>
              <th className="w-[170px] px-2">Who pays</th>
              <th className="w-[120px] px-2">Fee</th>
              <th className="w-[120px] px-2">Rider collects</th>
              <th className="w-[52px] px-2 text-center">Far</th>
              <th className="w-[150px] px-2">Note</th>
              <th className="w-12 pr-6 pl-2" />
            </tr>
          </thead>
          <tbody>
            {priced.map(({ row, quote, far, tariff, fee }, i) => {
              const err = (bad: boolean) => showErrors && bad;
              return (
                <tr key={row.id} className="border-b border-border align-top last:border-0">
                  <td className="py-3.5 pr-2 pl-6 text-muted-foreground tabular-nums">{i + 1}</td>
                  <td className="px-2 py-2.5">
                    <div className="flex flex-col gap-1.5">
                      <input
                        value={row.name}
                        onChange={(e) => setRow(row.id, { name: e.target.value })}
                        placeholder="Name"
                        aria-label={`Drop ${i + 1} receiver name`}
                        aria-invalid={err(!row.name.trim())}
                        className={cellInput}
                      />
                      <input
                        value={row.phone}
                        onChange={(e) => setRow(row.id, { phone: e.target.value })}
                        placeholder="Phone"
                        aria-label={`Drop ${i + 1} receiver phone`}
                        aria-invalid={err(!row.phone.trim())}
                        className={cn(cellInput, 'tabular-nums')}
                      />
                    </div>
                  </td>
                  <td className="px-2 py-2.5">
                    <AddressInput
                      compact
                      value={row.address}
                      query={row.addressQuery}
                      onChange={(address, addressQuery) => setRow(row.id, { address, addressQuery })}
                    />
                    {!row.address && row.addressQuery && (
                      <p className="mt-1 text-[12px] text-warning">Pick a suggestion to pin this address.</p>
                    )}
                  </td>
                  <td className="px-2 py-3.5 text-right text-foreground-secondary tabular-nums">
                    {quote ? quote.distanceKm : row.address ? '…' : '—'}
                  </td>
                  <td className="px-2 py-2.5">
                    <div className={cn(segmentTrack, 'flex w-full flex-nowrap')}>
                      {(['vendor', 'receiver'] as const).map((payer) => (
                        <button
                          key={payer}
                          type="button"
                          onClick={() => setRow(row.id, { payer })}
                          className={cn(segmentItem(row.payer === payer, 'sm'), 'h-7 flex-1 justify-center px-2 text-[12.5px]')}
                        >
                          {payer === 'vendor' ? 'Vendor' : 'Receiver'}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      {row.payer === 'vendor' ? 'Pays after delivery' : 'Pays rider at the door'}
                    </p>
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="field-wrap h-9 px-2.5">
                      <span>₦</span>
                      <input
                        type="number"
                        min={0}
                        value={row.feeOverride}
                        onChange={(e) => setRow(row.id, { feeOverride: e.target.value })}
                        placeholder={tariff != null ? String(tariff) : '…'}
                        aria-label={`Drop ${i + 1} fee`}
                        className="w-full min-w-0 border-0 bg-transparent text-foreground tabular-nums outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    {row.feeOverride !== '' && tariff != null && Number(row.feeOverride) !== tariff && (
                      <button
                        type="button"
                        onClick={() => setRow(row.id, { feeOverride: '' })}
                        className="mt-1 text-[12px] text-primary hover:text-warning"
                      >
                        Reset to {naira(tariff)}
                      </button>
                    )}
                  </td>
                  <td className="px-2 py-2.5">
                    {row.payer === 'receiver' ? (
                      <div
                        className={cn(
                          'field-wrap h-9 px-2.5',
                          err(row.collect !== '' && !(Number(row.collect) > 0)) && 'border-destructive'
                        )}
                      >
                        <span>₦</span>
                        <input
                          type="number"
                          min={0}
                          value={row.collect}
                          onChange={(e) => setRow(row.id, { collect: e.target.value })}
                          placeholder={fee != null ? String(fee) : '…'}
                          aria-label={`Drop ${i + 1} amount the rider collects`}
                          className="w-full min-w-0 border-0 bg-transparent text-foreground tabular-nums outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                    ) : (
                      <span className="block py-2 text-[13px] text-muted-foreground">Nothing</span>
                    )}
                  </td>
                  <td className="px-2 py-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={far}
                      disabled={!flatMode}
                      onChange={(e) => setRow(row.id, { farOverride: e.target.checked })}
                      title={flatMode ? 'Charge the far rate' : 'The far rate only applies to flat-rate bulks'}
                      aria-label={`Drop ${i + 1} far rate`}
                      className="size-4 accent-primary"
                    />
                  </td>
                  <td className="px-2 py-2.5">
                    <input
                      value={row.note}
                      onChange={(e) => setRow(row.id, { note: e.target.value })}
                      placeholder="Optional"
                      aria-label={`Drop ${i + 1} note`}
                      className={cellInput}
                    />
                  </td>
                  <td className="py-2.5 pr-6 pl-2">
                    <button
                      type="button"
                      onClick={() =>
                        setState((prev) => ({
                          ...prev,
                          rows: prev.rows.length > 1 ? prev.rows.filter((r) => r.id !== row.id) : [newRow()],
                        }))
                      }
                      aria-label={`Remove drop ${i + 1}`}
                      className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-negative-bg hover:text-destructive"
                    >
                      <Trash2Icon className="size-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ListCard>

      <StatStrip
        stats={[
          { label: 'Total fees', value: naira(totals.listed), meta: `${state.rows.length} ${state.rows.length === 1 ? 'drop' : 'drops'}` },
          {
            label: 'Vendor owes after delivery',
            value: naira(totals.vendor),
            meta: `${vendorRows} ${vendorRows === 1 ? 'drop' : 'drops'}`,
          },
          {
            label: 'Riders collect at the door',
            value: naira(totals.collect),
            meta: `${receiverRows} ${receiverRows === 1 ? 'drop' : 'drops'}`,
          },
          {
            label: 'Vendor’s split vs tariff',
            value: !splitInUse
              ? '—'
              : splitDiff === 0
                ? 'Balanced'
                : `${splitDiff > 0 ? '+' : '−'}${naira(Math.abs(splitDiff))}`,
            meta: splitInUse ? `Tariff ${naira(totals.receiverTariff)} on receiver drops` : 'No custom split',
          },
        ]}
      />

      {splitInUse && splitDiff !== 0 && (
        <InlineNotice>
          Riders will collect {naira(totals.collect)}, but the receiver drops are priced at {naira(totals.receiverTariff)}.
          Each drop is billed at what its rider collects, so this bulk totals {naira(totals.vendor + totals.collect)}.
          Check the split with the vendor.
        </InlineNotice>
      )}

      {showErrors && problems.length > 0 && (
        <section className="flex flex-col gap-2 rounded-[8px] bg-negative-bg px-4 py-3 text-[13.5px]">
          <span className="font-medium text-destructive">
            Fix {problems.length === 1 ? 'this' : `these ${problems.length}`} before booking
          </span>
          <ul className="list-disc space-y-0.5 pl-5 text-foreground">
            {problems.slice(0, 6).map((p) => (
              <li key={p}>{p}</li>
            ))}
            {problems.length > 6 && <li>And {problems.length - 6} more</li>}
          </ul>
        </section>
      )}

      {/* Floating booking bar: the total and the one action, always in reach while editing drops. */}
      <div
        role="region"
        aria-label="Booking"
        className="fixed bottom-6 left-1/2 z-40 flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-4 rounded-full bg-[#120460] py-2 pr-2 pl-5 text-[13.5px] text-white shadow-[0_12px_32px_rgba(18,4,96,0.35)] lg:left-[calc(50%+124px)] dark:bg-[#070418] dark:ring-1 dark:ring-white/10"
      >
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="font-semibold whitespace-nowrap tabular-nums">
            {naira(totals.listed)}{' '}
            <span className="font-normal text-white/70">
              for {state.rows.length} {state.rows.length === 1 ? 'drop' : 'drops'}
            </span>
          </span>
          <span className="truncate text-[12px] text-white/60">{dispatchSummary}</span>
        </span>
        <button
          type="button"
          onClick={() => {
            clearDraft();
            setState(emptyState());
            setPickups([]);
            setShowErrors(false);
          }}
          disabled={isSubmitting}
          className="h-9 rounded-full px-3.5 whitespace-nowrap text-white/75 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          Clear form
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={isSubmitting || isQuoting}
          aria-busy={isSubmitting || isQuoting || undefined}
          className="inline-flex h-9 items-center gap-2 rounded-full bg-[#FFD500] px-4 font-semibold whitespace-nowrap text-[#120460] transition-opacity hover:opacity-90 disabled:cursor-progress disabled:opacity-80"
        >
          {(isSubmitting || isQuoting) && <Spinner />}
          {isSubmitting ? 'Booking…' : isQuoting ? 'Pricing…' : bookLabel}
        </button>
      </div>
    </div>
  );
}

function DispatchNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[8px] bg-hi-soft px-3.5 py-3 text-[13px] leading-[1.5] text-foreground">{children}</p>
  );
}

function runsPreview(drops: number, runSize: BulkRunSize) {
  const runs = Math.ceil(drops / Math.max(1, runSize.maxDrops));
  const smallest = Math.floor(drops / runs);
  const largest = Math.ceil(drops / runs);
  return `${drops} drops go to ${runs} ${runs === 1 ? 'rider' : 'riders'}, ${smallest}${
    smallest === largest ? '' : `–${largest}`
  } drops each.${
    smallest < runSize.minDrops ? ' Runs under the minimum wait in the pool for you to assign.' : ''
  }`;
}

const riderName = (rider: AdminRider) =>
  [rider.firstName, rider.lastName].filter(Boolean).join(' ') || rider.phone || 'Unnamed rider';

/**
 * Riders are listed with their state rather than filtered to the online ones:
 * someone about to start a shift is a fine choice. Only vehicle is filtered,
 * since the whole trip runs on one.
 */
function RiderPicker({
  riders,
  vehicleType,
  value,
  onChange,
  invalid,
  drops,
}: {
  riders: AdminRider[];
  vehicleType: string;
  value: string;
  onChange: (riderId: string) => void;
  invalid: boolean;
  drops: number;
}) {
  const [search, setSearch] = useState('');
  const eligible = useMemo(
    () =>
      riders
        .filter((r) => !r.vehicleType || r.vehicleType === vehicleType)
        .sort(
          (a, b) =>
            Number(b.status === 'online') - Number(a.status === 'online') ||
            Number(!!b.isInHouse) - Number(!!a.isInHouse) ||
            riderName(a).localeCompare(riderName(b))
        ),
    [riders, vehicleType]
  );
  const term = search.trim().toLowerCase();
  const shown = term
    ? eligible.filter((r) =>
        [riderName(r), r.phone, r.plateNumber].some((v) => v?.toLowerCase().includes(term))
      )
    : eligible;
  const chosen = eligible.find((r) => r._id === value);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] text-foreground-secondary">
          {chosen ? (
            <>
              All {drops} drops go to <span className="font-semibold text-foreground">{riderName(chosen)}</span> as
              one run. They’re told straight away, even if offline.
            </>
          ) : (
            `Pick who takes all ${drops} drops. ${vehicleType} riders only.`
          )}
        </span>
        <div className="relative w-full sm:w-64">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, phone or plate"
            aria-label="Search riders"
            className="h-[38px] w-full rounded-full border border-border bg-background pr-4 pl-9 text-[13.5px] outline-none focus-visible:border-ring"
          />
        </div>
      </div>
      <div
        role="radiogroup"
        aria-label="Rider"
        aria-invalid={invalid}
        className={cn(
          'max-h-[288px] overflow-y-auto rounded-[8px] border bg-card',
          invalid ? 'border-destructive' : 'border-border'
        )}
      >
        {shown.length === 0 ? (
          <p className="px-3 py-8 text-center text-[13.5px] text-muted-foreground">
            {eligible.length === 0 ? `No ${vehicleType} riders to assign this to.` : 'No rider matches that search.'}
          </p>
        ) : (
          shown.map((rider) => {
            const active = rider._id === value;
            const online = rider.status === 'online';
            return (
              <button
                key={rider._id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange(rider._id)}
                className={cn(
                  'flex w-full items-center gap-3 border-b border-border px-3.5 py-2.5 text-left last:border-0',
                  active ? 'bg-brand-tint' : 'hover:bg-muted'
                )}
              >
                <span
                  className={cn(
                    'flex size-[38px] shrink-0 items-center justify-center rounded-full text-[13px] font-semibold',
                    active ? 'bg-primary text-primary-foreground' : 'bg-brand-tint text-primary'
                  )}
                >
                  {active ? <CheckIcon className="size-4" /> : riderName(rider).slice(0, 1).toUpperCase()}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[14px] font-medium text-foreground">{riderName(rider)}</span>
                  <span className="truncate text-[12.5px] text-muted-foreground tabular-nums">
                    {[rider.phone && formatPhone(rider.phone), rider.plateNumber?.toUpperCase()].filter(Boolean).join(' · ') || '—'}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <Badge variant="secondary">{rider.isInHouse ? 'In-house' : 'Gig'}</Badge>
                  <Badge variant={online ? 'positive' : 'secondary'} dot={online}>
                    {online ? 'Online' : humanize(rider.status || 'offline')}
                  </Badge>
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function NumberField({
  label,
  unit,
  help,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  help?: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label} help={help}>
      <div className="field-wrap">
        <span>{unit}</span>
        <input
          type="number"
          min={0}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
          className="w-full min-w-0 border-0 bg-transparent text-foreground tabular-nums outline-none"
        />
      </div>
    </Field>
  );
}

function PasteDropsDialog({ onAdd }: { onAdd: (rows: DropRow[]) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const parsed = useMemo(() => parseDrops(text), [text]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <ClipboardPasteIcon />
        Paste from WhatsApp
      </DialogTrigger>
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
          className="field-area w-full font-mono"
        />
        {parsed.length > 0 && (
          <div className="max-h-[200px] overflow-y-auto rounded-[8px] border border-border text-[13px]">
            {parsed.map((d, i) => (
              <div key={i} className="flex gap-3 border-b border-border px-3 py-2 last:border-0">
                <span className="w-5 shrink-0 text-muted-foreground tabular-nums">{i + 1}</span>
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
