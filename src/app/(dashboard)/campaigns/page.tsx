import Link from 'next/link';
import { authedFetch, ApiError, SingleResponse } from '@/lib/api-client';
import { ApiErrorCard } from '@/components/api-error-card';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatStrip } from '@/components/stat-strip';
import { SettingsForm } from '@/components/settings-form';
import {
  EmptyState,
  Field,
  FieldGrid,
  PageHeader,
  PageStack,
  Panel,
  SettingsLayout,
} from '@/components/page';
import { humanize } from '@/lib/format';
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

interface StepConversion {
  campaign: string;
  step: string;
  count: number;
  revenue?: number;
}

interface CampaignStats {
  byStep: StepStat[];
  sentPerDay: { day: string; count: number }[];
  conversions: StepConversion[];
  clicks: StepConversion[];
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
  let stats: CampaignStats = {
    byStep: [],
    sentPerDay: [],
    conversions: [],
    clicks: [],
  };
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
        conversions: statsResult.data.conversions ?? [],
        clicks: statsResult.data.clicks ?? [],
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

  // Pivot byStep rows into one row per campaign step with a column per status,
  // then fold in clicks and conversions.
  const statRows = new Map<
    string,
    {
      campaign: string;
      step: string;
      counts: Record<string, number>;
      clicks: number;
      conversions: number;
      revenue: number;
    }
  >();
  const rowFor = (campaign: string, step: string) => {
    const key = `${campaign}:${step}`;
    if (!statRows.has(key)) {
      statRows.set(key, {
        campaign,
        step,
        counts: {},
        clicks: 0,
        conversions: 0,
        revenue: 0,
      });
    }
    return statRows.get(key)!;
  };
  for (const row of stats.byStep) {
    rowFor(row.campaign, row.step).counts[row.status] = row.count;
  }
  for (const row of stats.clicks) {
    rowFor(row.campaign, row.step).clicks = row.count;
  }
  for (const row of stats.conversions) {
    const target = rowFor(row.campaign, row.step);
    target.conversions = row.count;
    target.revenue = row.revenue ?? 0;
  }

  const maxDaily = Math.max(1, ...stats.sentPerDay.map((d) => d.count));

  const totalSent = stats.sentPerDay.reduce((sum, d) => sum + d.count, 0);
  const totalConversions = [...statRows.values()].reduce((sum, r) => sum + r.conversions, 0);
  const totalRevenue = [...statRows.values()].reduce((sum, r) => sum + r.revenue, 0);
  const enabledCount = registry.filter(
    (c) => config.campaigns[c.id]?.enabled ?? c.enabledByDefault
  ).length;

  return (
    <PageStack>
      <PageHeader
        title="Campaigns"
        subtitle="Automated lifecycle nudges by push, email and in-app. Changes apply within 30 seconds, no redeploy needed."
        actions={
          <Link href="/campaigns/messages" className={buttonVariants({ variant: 'outline' })}>
            Send log
          </Link>
        }
      />

      <StatStrip
        stats={[
          { label: 'Campaigns on', value: `${enabledCount} of ${registry.length}` },
          { label: 'Sent, last 30 days', value: totalSent.toLocaleString() },
          { label: 'Conversions', value: totalConversions.toLocaleString(), meta: 'Paid within 24h of a nudge' },
          { label: 'Revenue credited', value: `₦ ${totalRevenue.toLocaleString()}` },
        ]}
      />

      <SettingsForm action={handleSave} label="Unsaved campaign changes">
        <SettingsLayout
          aside={
            <>
              <Panel title="Sends" description="Messages that actually went out in the last 30 days, per day.">
                {stats.sentPerDay.length === 0 ? (
                  <p className="text-[13.5px] text-muted-foreground">Nothing sent yet.</p>
                ) : (
                  <div className="flex h-[110px] items-end gap-[2px]">
                    {stats.sentPerDay.map((d) => (
                      <div
                        key={d.day}
                        title={`${d.day}: ${d.count}`}
                        className="flex-1 rounded-t-[3px] bg-primary"
                        style={{ height: `${Math.max(4, (d.count / maxDaily) * 100)}%` }}
                      />
                    ))}
                  </div>
                )}
              </Panel>
              <div className="rounded-[8px] bg-hi-soft px-3.5 py-3 text-[13px] leading-[1.5]">
                At most {config.maxMarketingPerDay} marketing {config.maxMarketingPerDay === 1 ? 'message' : 'messages'} a
                customer a day, and nothing between {String(config.quietStartHour).padStart(2, '0')}:00 and{' '}
                {String(config.quietEndHour).padStart(2, '0')}:00.
              </div>
            </>
          }
        >
          <Panel
            title="Guardrails"
            description="Apply to every campaign. Messages inside quiet hours or over the daily cap are deferred to the next window, never dropped."
          >
            <FieldGrid>
              {[
                { label: 'Max marketing messages a day', name: 'maxMarketingPerDay', unit: '#', value: config.maxMarketingPerDay },
                { label: 'Quiet hours start', name: 'quietStartHour', unit: 'hr', value: config.quietStartHour },
                { label: 'Quiet hours end', name: 'quietEndHour', unit: 'hr', value: config.quietEndHour },
                { label: 'Win-back lookback', name: 'winbackMaxLookbackDays', unit: 'days', value: config.winbackMaxLookbackDays },
              ].map((field) => (
                <Field key={field.name} label={field.label} htmlFor={field.name}>
                  <div className="field-wrap">
                    <span>{field.unit}</span>
                    <input
                      id={field.name}
                      name={field.name}
                      type="number"
                      step="any"
                      defaultValue={field.value}
                      className="w-full border-0 bg-transparent text-foreground tabular-nums outline-none"
                    />
                  </div>
                </Field>
              ))}
            </FieldGrid>
          </Panel>

          {registry.map((campaign) => {
            const copy = CAMPAIGN_COPY[campaign.id] ?? { title: humanize(campaign.id), sub: '' };
            const toggle = config.campaigns[campaign.id];
            return (
              <Panel
                key={campaign.id}
                title={copy.title}
                description={copy.sub}
                aside={
                  <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[13.5px] font-medium">
                    <input
                      type="checkbox"
                      name={`enabled-${campaign.id}`}
                      defaultChecked={toggle?.enabled ?? campaign.enabledByDefault}
                      className="size-4 accent-primary"
                    />
                    On
                  </label>
                }
              >
                <FieldGrid>
                  {campaign.steps.map((step) => {
                    const effectiveMs = toggle?.stepDelays?.[step.id] ?? step.defaultDelayMs;
                    return (
                      <Field
                        key={step.id}
                        label={STEP_LABELS[step.id] ?? humanize(step.id)}
                        htmlFor={`delay-${campaign.id}-${step.id}`}
                        help={step.channels.map(humanize).join(' · ')}
                      >
                        <div className="field-wrap">
                          <span>min</span>
                          <input
                            id={`delay-${campaign.id}-${step.id}`}
                            name={`delay-${campaign.id}-${step.id}`}
                            type="number"
                            min={0}
                            step="any"
                            defaultValue={Math.round(effectiveMs / 60000)}
                            className="w-full border-0 bg-transparent text-foreground tabular-nums outline-none"
                          />
                        </div>
                      </Field>
                    );
                  })}
                </FieldGrid>
              </Panel>
            );
          })}
        </SettingsLayout>
      </SettingsForm>

      <Panel
        flush
        title="Outcomes by step"
        description="Every claim ends in exactly one of these states. Skips are healthy: the customer left the journey before the nudge fired. Conversions are last-touch: a payment within 24 hours of a nudge credits that nudge."
      >
        {statRows.size === 0 ? (
          <EmptyState title="No campaign activity yet" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Step</TableHead>
                  <TableHead>Outcomes</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Conversions</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...statRows.values()].map((row) => (
                  <TableRow key={`${row.campaign}:${row.step}`}>
                    <TableCell>
                      <div className="font-medium">{STEP_LABELS[row.step] ?? humanize(row.step)}</div>
                      <div className="text-[12.5px] text-muted-foreground">
                        {CAMPAIGN_COPY[row.campaign]?.title ?? humanize(row.campaign)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="flex flex-wrap gap-1.5">
                        {STATUS_ORDER.filter((st) => row.counts[st]).map((st) => (
                          <Badge key={st} variant={statusVariant(st)}>
                            {humanize(st)} {row.counts[st].toLocaleString()}
                          </Badge>
                        ))}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.clicks.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.conversions.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      ₦ {row.revenue.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>
    </PageStack>
  );
}
