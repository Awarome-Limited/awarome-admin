import { authedFetch, ApiError, PaginatedResponse } from '@/lib/api-client';
import { AdminMobileAd, AdminWebBanner } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { ConfirmActionButton } from '@/components/confirm-action-button';
import { PromoCodeActiveControl } from '@/components/promo-code-active-toggle';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { formatDate, humanize } from '@/lib/format';
import { StatStrip } from '@/components/stat-strip';
import { SegmentedLinks } from '@/components/segmented';
import { EmptyRow, InlineNotice, ListCard, PageHeader, PageStack } from '@/components/page';
import {
  deleteMobileAd,
  deleteWebBanner,
  toggleWebBannerActive,
} from './actions';
import { WebBannerDialog } from './_components/web-banner-dialog';
import { MobileAdDialog } from './_components/mobile-ad-dialog';
import { BannerOrderControls } from './_components/banner-order-controls';

const TABS = [
  { key: 'web', label: 'Banners' },
  { key: 'mobile', label: 'App image ads (legacy)' },
] as const;

const PLACEMENT_LABEL: Record<string, string> = {
  web: 'Website',
  mobile: 'App',
  both: 'Website + app',
};

const THEME_SWATCH: Record<string, string> = {
  indigo: '#120460',
  yellow: '#FFD500',
  peach: '#FFF3E4',
};

function scheduleStatus(banner: AdminWebBanner) {
  if (!banner.isActive) return { label: 'Inactive', tone: 'muted' as const };

  const now = Date.now();
  if (banner.startsAt && new Date(banner.startsAt).getTime() > now) {
    return { label: 'Scheduled', tone: 'info' as const };
  }
  if (banner.endsAt && new Date(banner.endsAt).getTime() < now) {
    return { label: 'Expired', tone: 'muted' as const };
  }
  return { label: 'Live', tone: 'success' as const };
}

function vendorLabel(vendor: AdminMobileAd['vendor']) {
  if (!vendor) return '—';
  if (typeof vendor === 'string') return vendor;
  return vendor.businessName || vendor.name || vendor._id;
}

export default async function BannersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const tab = params.tab === 'mobile' ? 'mobile' : 'web';

  let webBanners: AdminWebBanner[] = [];
  let mobileAds: AdminMobileAd[] = [];

  try {
    if (tab === 'web') {
      const res = await authedFetch<PaginatedResponse<AdminWebBanner>>(
        '/web-banners?limit=100'
      );
      webBanners = [...res.data].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
      );
    } else {
      const res = await authedFetch<PaginatedResponse<AdminMobileAd>>(
        '/ads?limit=100'
      );
      mobileAds = res.data;
    }
  } catch (error) {
    return (
      <ApiErrorCard
        message={
          error instanceof ApiError ? error.message : 'Something went wrong.'
        }
      />
    );
  }

  const orderedIds = webBanners.map((b) => b._id);
  const liveCount = webBanners.filter(
    (b) => scheduleStatus(b).label === 'Live'
  ).length;

  const tabs = (
    <SegmentedLinks
      active={tab}
      items={TABS.map((t) => ({
        key: t.key,
        label: t.label,
        href: t.key === 'web' ? '/banners' : `/banners?tab=${t.key}`,
      }))}
    />
  );

  return (
    <PageStack>
      <PageHeader
        title="Banners"
        subtitle="Homepage hero slides for awarome.com and the app’s banner carousel."
        actions={tab === 'web' ? <WebBannerDialog /> : <MobileAdDialog />}
      />

      {tab === 'web' && (
        <>
          <StatStrip
            stats={[
              { label: 'Live now', value: liveCount.toLocaleString() },
              { label: 'All banners', value: webBanners.length.toLocaleString() },
            ]}
          />
          {liveCount === 0 && (
            <InlineNotice>
              No banner is live. The website shows its default slide and the app falls back to the legacy image ads.
            </InlineNotice>
          )}
          <ListCard
            toolbar={
              <>
                {tabs}
                <span className="text-[13px] text-muted-foreground">
                  Order here is the order they appear on the website and in the app.
                </span>
              </>
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70px]">Order</TableHead>
                  <TableHead>Banner</TableHead>
                  <TableHead>Shows on</TableHead>
                  <TableHead>Links to</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webBanners.map((banner, index) => {
                  const status = scheduleStatus(banner);
                  return (
                    <TableRow key={banner._id}>
                      <TableCell>
                        <BannerOrderControls ids={orderedIds} index={index} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span
                            aria-hidden
                            className="h-9 w-14 shrink-0 rounded-[8px] border border-border bg-cover bg-center"
                            style={{
                              background:
                                banner.theme === 'custom'
                                  ? banner.backgroundColor || '#120460'
                                  : THEME_SWATCH[banner.theme],
                              backgroundImage:
                                banner.mode === 'image' && banner.imageUrl ? `url(${banner.imageUrl})` : undefined,
                            }}
                          />
                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              {banner.headline || banner.imageAlt || 'Untitled banner'}
                            </div>
                            <div className="truncate text-[12.5px] text-muted-foreground">
                              {banner.mode === 'image' ? 'Full image' : `${humanize(banner.theme)} theme`}
                              {banner.eyebrow ? ` · ${banner.eyebrow}` : ''}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{PLACEMENT_LABEL[banner.placement ?? 'web']}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-foreground-secondary">
                        {banner.linkType === 'none' ? (
                          'Nothing'
                        ) : (
                          <>
                            {humanize(banner.linkType)}: {banner.linkValue}
                          </>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-foreground-secondary tabular-nums">
                        {banner.startsAt || banner.endsAt ? (
                          <>
                            {banner.startsAt ? formatDate(banner.startsAt).split(',')[0] : 'Now'}
                            {' to '}
                            {banner.endsAt ? formatDate(banner.endsAt).split(',')[0] : 'open'}
                          </>
                        ) : (
                          'Always on'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start gap-2">
                          <Badge variant={status.tone === 'success' ? 'positive' : 'secondary'} dot={status.tone === 'success'}>
                            {status.label}
                          </Badge>
                          <PromoCodeActiveControl
                            isActive={banner.isActive}
                            action={toggleWebBannerActive.bind(null, banner._id, !banner.isActive)}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <WebBannerDialog banner={banner} />
                          <ConfirmActionButton
                            label="Delete"
                            title="Delete this banner?"
                            description="It will stop appearing wherever it's shown (website, app or both) immediately."
                            action={deleteWebBanner.bind(null, banner._id)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {webBanners.length === 0 && (
                  <EmptyRow
                    colSpan={7}
                    title="No banners yet"
                    body="The website shows its default slide and the app the legacy image ads until you create one."
                  />
                )}
              </TableBody>
            </Table>
          </ListCard>
        </>
      )}

      {tab === 'mobile' && (
        <ListCard
          toolbar={
            <>
              {tabs}
              <span className="text-[13px] text-muted-foreground">
                Older app versions show 3 of these at random; the current app only while no banner is live for it.
              </span>
            </>
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mobileAds.map((ad) => (
                <TableRow key={ad._id}>
                  <TableCell>
                    <span
                      aria-hidden
                      className="block h-10 w-28 rounded-[8px] border border-border bg-muted bg-cover bg-center"
                      style={{ backgroundImage: ad.bannerImage ? `url(${ad.bannerImage})` : undefined }}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{vendorLabel(ad.vendor)}</TableCell>
                  <TableCell className="whitespace-nowrap text-foreground-secondary tabular-nums">
                    {ad.createdAt ? formatDate(ad.createdAt).split(',')[0] : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <ConfirmActionButton
                      label="Delete"
                      title="Delete this mobile ad?"
                      description="It will stop appearing in the app's home carousel."
                      action={deleteMobileAd.bind(null, ad._id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {mobileAds.length === 0 && <EmptyRow colSpan={4} title="No app image ads" />}
            </TableBody>
          </Table>
        </ListCard>
      )}
    </PageStack>
  );
}
