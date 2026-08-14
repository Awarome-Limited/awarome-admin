import Link from 'next/link';
import { authedFetch, ApiError, PaginatedResponse } from '@/lib/api-client';
import { AdminMobileAd, AdminWebBanner } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { ConfirmActionButton } from '@/components/confirm-action-button';
import { PromoCodeActiveToggle } from '@/components/promo-code-active-toggle';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  deleteMobileAd,
  deleteWebBanner,
  toggleWebBannerActive,
} from './actions';
import { WebBannerDialog } from './_components/web-banner-dialog';
import { MobileAdDialog } from './_components/mobile-ad-dialog';
import { BannerOrderControls } from './_components/banner-order-controls';

const TABS = [
  { key: 'web', label: 'Web' },
  { key: 'mobile', label: 'Mobile app' },
] as const;

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[23px] font-bold tracking-tight text-foreground">
            Banners
          </h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Homepage hero slides for awarome.com and the app&apos;s banner carousel
          </p>
        </div>
        {tab === 'web' ? <WebBannerDialog /> : <MobileAdDialog />}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === 'web' ? '/banners' : `/banners?tab=${t.key}`}
            className={cn(
              'rounded-[9px] border px-3.5 py-[7px] text-[13px] font-semibold transition-colors',
              tab === t.key
                ? 'border-transparent bg-brand-tint text-primary'
                : 'border-border-strong bg-card text-foreground-secondary hover:bg-muted'
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === 'web' && (
        <>
          <p className="text-[13px] text-muted-foreground">
            {liveCount} of {webBanners.length} live. Order here is the order they
            appear in the hero carousel.
          </p>

          <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[70px]">Order</TableHead>
                    <TableHead>Banner</TableHead>
                    <TableHead>Type</TableHead>
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
                              className="h-8 w-12 shrink-0 rounded-md border border-border bg-cover bg-center"
                              style={{
                                background:
                                  banner.theme === 'custom'
                                    ? banner.backgroundColor || '#120460'
                                    : THEME_SWATCH[banner.theme],
                                backgroundImage:
                                  banner.mode === 'image' && banner.imageUrl
                                    ? `url(${banner.imageUrl})`
                                    : undefined,
                              }}
                            />
                            <div className="min-w-0">
                              <div className="truncate font-semibold">
                                {banner.headline || banner.imageAlt || 'Untitled'}
                              </div>
                              {banner.eyebrow && (
                                <div className="truncate text-xs text-muted-foreground">
                                  {banner.eyebrow}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize text-muted-foreground">
                          {banner.mode === 'image' ? 'Full image' : banner.theme}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {banner.linkType === 'none' ? (
                            '—'
                          ) : (
                            <span className="font-mono text-xs">
                              {banner.linkType}: {banner.linkValue}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {banner.startsAt || banner.endsAt ? (
                            <span className="text-xs">
                              {banner.startsAt
                                ? formatDate(banner.startsAt).split(',')[0]
                                : 'now'}
                              {' → '}
                              {banner.endsAt
                                ? formatDate(banner.endsAt).split(',')[0]
                                : 'open'}
                            </span>
                          ) : (
                            'Always on'
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1.5">
                            <Badge
                              variant={
                                status.tone === 'success' ? 'default' : 'secondary'
                              }
                            >
                              {status.label}
                            </Badge>
                            <PromoCodeActiveToggle
                              isActive={banner.isActive}
                              action={toggleWebBannerActive.bind(
                                null,
                                banner._id,
                                !banner.isActive
                              )}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <WebBannerDialog banner={banner} />
                            <ConfirmActionButton
                              label="Delete"
                              title="Delete this banner?"
                              description="It will stop appearing on the website immediately. The mobile app is unaffected."
                              action={deleteWebBanner.bind(null, banner._id)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {webBanners.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-10 text-center text-muted-foreground"
                      >
                        No web banners yet. The homepage falls back to its default
                        slide until you create one.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      {tab === 'mobile' && (
        <>
          <p className="text-[13px] text-muted-foreground">
            The app shows 3 of these at random. Every ad must have a vendor — the
            app links the banner to that vendor&apos;s store.
          </p>

          <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Banner</TableHead>
                    <TableHead>Vendor</TableHead>
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
                          className="block h-9 w-24 rounded-md border border-border bg-muted bg-cover bg-center"
                          style={{
                            backgroundImage: ad.bannerImage
                              ? `url(${ad.bannerImage})`
                              : undefined,
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-semibold">
                        {vendorLabel(ad.vendor)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
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
                  {mobileAds.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-10 text-center text-muted-foreground"
                      >
                        No mobile ads found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
