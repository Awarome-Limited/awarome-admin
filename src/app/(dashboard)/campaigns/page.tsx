import Link from 'next/link';
import { authedFetch, ApiError, SingleResponse } from '@/lib/api-client';
import { ApiErrorCard } from '@/components/api-error-card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { updateCampaignConfig } from './actions';

interface CampaignRegistryStep {
  id: string;
  defaultDelayMs: number;
  channels: string[];
}

interface CampaignRegistryEntry {
  id: string;
  enabledByDefault: boolean;
  steps: CampaignRegistryStep[];
}

interface CampaignConfig {
  campaigns: Record<
    string,
    { enabled: boolean; stepDelays?: Record<string, number> }
  >;
  maxMarketingPerDay: number;
  quietStartHour: number;
  quietEndHour: number;
  sweepBatchLimit: number;
  winbackMaxLookbackDays: number;
  registry: CampaignRegistryEntry[];
}

interface StepStat {
  campaign: string;
  step: string;
  status: string;
  count: number;
}

interface CampaignStats {
  byStep: StepStat[];
  sentPerDay: { day: string; count: number }[];
}

// Display copy for the code-defined campaigns; unknown ids fall back to the
// raw id so new backend campaigns still render.
const CAMPAIGN_COPY: Record<string, { title: string; sub: string }> = {
  activation: {
    title: 'Marketplace activation',
    sub: 'Welcome new customers and nudge them toward a first shop order. Exits once they place a paid marketplace order.',
  },
  'delivery-activation': {
    title: 'Package delivery activation',
    sub: 'Introduce new customers to package delivery. Runs independently of the marketplace drip and exits once they pay for a first delivery.',
  },
  'abandoned-cart': {
    title: 'Abandoned cart',
    sub: 'Customers with items sitting in an untouched cart. A re-touched cart restarts the sequence.',
  },
  'abandoned-checkout': {
    title: 'Abandoned checkout',
    sub: 'Started checkout but never paid. Exits automatically when payment lands.',
  },
  'package-delivery': {
    title: 'Abandoned delivery booking',
    sub: 'Set up a package delivery but never paid. Exits automatically when the booking is paid.',
  },
  winback: {
    title: 'Win-back',
    sub: 'Dormant customers, measured from their last activity in the app.',
  },
};

const STEP_LABELS: Record<string, string> = {
  welcome: 'Welcome message',
  'browse-nudge': 'Browse nudge',
  'first-purchase-nudge': 'First-purchase nudge',
  'delivery-intro': 'Delivery intro',
  'delivery-nudge': 'First-delivery nudge',
  'cart-push': 'Cart reminder (push)',
  'cart-email': 'Cart reminder (email)',
  'checkout-nudge': 'Checkout nudge',
  'booking-nudge': 'Booking nudge',
  'winback-7d': 'First win-back',
  'winback-21d': 'Second win-back',
};

const STATUS_ORDER = ['sent', 'partial', 'deferred', 'skipped', 'failed'] as const;

function statusVariant(
  status: string
): 'positive' | 'warning' | 'info' | 'secondary' | 'destructive' {
  if (status === 'sent') return 'positive';
  if (status === 'partial') return 'warning';
  if (status === 'deferred') return 'info';
  if (status === 'failed') return 'destructive';
  return 'secondary';
}

export default async function CampaignsPage() {
  let config: CampaignConfig;
  let stats: CampaignStats = { byStep: [], sentPerDay: [] };
  try {
    const result = await authedFetch<SingleResponse<CampaignConfig>>(
      '/admins/campaigns/config'
    );
    config = result.data;
    try {
      const statsResult = await authedFetch<SingleResponse<CampaignStats>>(
        '/admins/campaigns/stats'
      );
      stats = {
        byStep: statsResult.data.byStep ?? [],
        sentPerDay: statsResult.data.sentPerDay ?? [],
      };
    } catch {
      // Stats are additive — the config form still works without them.
    }
  } catch (error) {
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Something went wrong.'}
      />
    );
  }

  const registry = config.registry ?? [];

  async function handleSave(formData: FormData) {
    'use server';
    const num = (name: string) => Number(formData.get(name));

    const campaigns: Record<
      string,
      { enabled: boolean; stepDelays: Record<string, number> }
    > = {};
    for (const campaign of registry) {
      const stepDelays: Record<string, number> = {};
      for (const step of campaign.steps) {
        const minutes = num(`delay-${campaign.id}-${step.id}`);
        if (!Number.isNaN(minutes) && minutes >= 0) {
          stepDelays[step.id] = Math.round(minutes * 60000);
        }
      }
      campaigns[campaign.id] = {
        enabled: formData.get(`enabled-${campaign.id}`) === 'on',
        stepDelays,
      };
    }

    await updateCampaignConfig({
      campaigns,
      maxMarketingPerDay: num('maxMarketingPerDay'),
      quietStartHour: num('quietStartHour'),
      quietEndHour: num('quietEndHour'),
      winbackMaxLookbackDays: num('winbackMaxLookbackDays'),
    });
  }

  // Pivot byStep rows into one row per campaign step with a column per status.
  const statRows = new Map<string, { campaign: string; step: string; counts: Record<string, number> }>();
  for (const row of stats.byStep) {
    const key = `${row.campaign}:${row.step}`;
    if (!statRows.has(key)) {
      statRows.set(key, { campaign: row.campaign, step: row.step, counts: {} });
    }
    statRows.get(key)!.counts[row.status] = row.count;
  }

  const maxDaily = Math.max(1, ...stats.sentPerDay.map((d) => d.count));

  return (
    <>
      <form action={handleSave}>
        <div className="flex flex-wrap items-start justify-between gap-4 pb-[18px]">
          <div>
            <h1 className="text-[23px] font-bold tracking-tight text-foreground">Campaigns</h1>
            <p className="mt-1 text-[14px] text-muted-foreground">
              Automated lifecycle nudges — push, email and in-app. Changes apply within 30
              seconds — no redeploy needed.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/campaigns/messages"
              className={buttonVariants({ variant: 'outline' })}
            >
              Send log
            </Link>
            <Button type="submit">Save changes</Button>
          </div>
        </div>

        <div className="flex flex-col gap-4" style={{ maxWidth: 900 }}>
          <div className="rounded-[14px] border border-border bg-card p-[22px_24px] shadow-[var(--shadow-card)]">
            <div className="text-[15px] font-semibold text-foreground">Guardrails</div>
            <div className="mb-[18px] mt-1 text-[13px] text-muted-foreground">
              Apply to every campaign. Messages inside quiet hours or over the daily cap are
              deferred to the next window, never dropped silently.
            </div>
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
              {[
                {
                  label: 'Max marketing messages / day',
                  name: 'maxMarketingPerDay',
                  unit: '#',
                  value: config.maxMarketingPerDay,
                },
                {
                  label: 'Quiet hours start (Lagos)',
                  name: 'quietStartHour',
                  unit: 'hr',
                  value: config.quietStartHour,
                },
                {
                  label: 'Quiet hours end (Lagos)',
                  name: 'quietEndHour',
                  unit: 'hr',
                  value: config.quietEndHour,
                },
                {
                  label: 'Win-back max lookback',
                  name: 'winbackMaxLookbackDays',
                  unit: 'days',
                  value: config.winbackMaxLookbackDays,
                },
              ].map((field) => (
                <div key={field.name} className="flex flex-col gap-[7px]">
                  <span className="text-[13px] font-medium text-foreground-secondary">
                    {field.label}
                  </span>
                  <div className="flex items-center gap-2 rounded-[10px] border border-input bg-muted px-[13px] py-[10px]">
                    <span className="text-[13px] font-semibold text-muted-foreground">
                      {field.unit}
                    </span>
                    <input
                      name={field.name}
                      type="number"
                      step="any"
                      defaultValue={field.value}
                      className="w-full border-none bg-transparent text-[14px] font-semibold tabular-nums text-foreground outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {registry.map((campaign) => {
            const copy = CAMPAIGN_COPY[campaign.id] ?? {
              title: campaign.id,
              sub: '',
            };
            const toggle = config.campaigns[campaign.id];
            return (
              <div
                key={campaign.id}
                className="rounded-[14px] border border-border bg-card p-[22px_24px] shadow-[var(--shadow-card)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[15px] font-semibold text-foreground">{copy.title}</div>
                    <div className="mb-[18px] mt-1 text-[13px] text-muted-foreground">{copy.sub}</div>
                  </div>
                  <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[13px] font-medium text-foreground-secondary">
                    <input
                      type="checkbox"
                      name={`enabled-${campaign.id}`}
                      defaultChecked={toggle?.enabled ?? campaign.enabledByDefault}
                      className="size-4 accent-primary"
                    />
                    Enabled
                  </label>
                </div>
                <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
                  {campaign.steps.map((step) => {
                    const effectiveMs =
                      toggle?.stepDelays?.[step.id] ?? step.defaultDelayMs;
                    return (
                      <div key={step.id} className="flex flex-col gap-[7px]">
                        <span className="text-[13px] font-medium text-foreground-secondary">
                          {STEP_LABELS[step.id] ?? step.id}
                          <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                            {step.channels.join(' · ')}
                          </span>
                        </span>
                        <div className="flex items-center gap-2 rounded-[10px] border border-input bg-muted px-[13px] py-[10px]">
                          <span className="text-[13px] font-semibold text-muted-foreground">min</span>
                          <input
                            name={`delay-${campaign.id}-${step.id}`}
                            type="number"
                            min={0}
                            step="any"
                            defaultValue={Math.round(effectiveMs / 60000)}
                            className="w-full border-none bg-transparent text-[14px] font-semibold tabular-nums text-foreground outline-none"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </form>

      <div className="mt-8 flex flex-col gap-4" style={{ maxWidth: 900 }}>
        <div className="rounded-[14px] border border-border bg-card p-[22px_24px] shadow-[var(--shadow-card)]">
          <div className="text-[15px] font-semibold text-foreground">Sends — last 30 days</div>
          <div className="mb-[18px] mt-1 text-[13px] text-muted-foreground">
            Messages that actually went out (sent or partial), per day.
          </div>
          {stats.sentPerDay.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">Nothing sent yet.</p>
          ) : (
            <div className="flex h-[120px] items-end gap-[3px]">
              {stats.sentPerDay.map((d) => (
                <div
                  key={d.day}
                  title={`${d.day}: ${d.count}`}
                  className="flex-1 rounded-t-[3px] bg-primary/70"
                  style={{ height: `${Math.max(4, (d.count / maxDaily) * 100)}%` }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[14px] border border-border bg-card p-[22px_24px] shadow-[var(--shadow-card)]">
          <div className="text-[15px] font-semibold text-foreground">Outcomes by step</div>
          <div className="mb-[18px] mt-1 text-[13px] text-muted-foreground">
            Every claim ends in exactly one of these states. Skips are healthy — they mean the
            user exited the journey (purchased, emptied their cart) before the nudge fired.
          </div>
          {statRows.size === 0 ? (
            <p className="text-[13px] text-muted-foreground">No campaign activity yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {[...statRows.values()].map((row) => (
                <div
                  key={`${row.campaign}:${row.step}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-border/60 px-3 py-2"
                >
                  <span className="text-[13px] font-medium text-foreground">
                    {(CAMPAIGN_COPY[row.campaign]?.title ?? row.campaign)}
                    <span className="text-muted-foreground"> · {STEP_LABELS[row.step] ?? row.step}</span>
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    {STATUS_ORDER.filter((s) => row.counts[s]).map((s) => (
                      <Badge key={s} variant={statusVariant(s)}>
                        {s} {row.counts[s]}
                      </Badge>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
