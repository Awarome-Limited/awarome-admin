'use client';

import type {
  WebBannerCtaVariant,
  WebBannerMode,
  WebBannerTheme,
} from '@/lib/types';

// Verbatim from the Awarome design system colour tokens. Hard-coded rather
// than themed because this preview must look like the website, not the admin.
const BRAND = {
  indigo: '#120460',
  orange: '#FF6B35',
  yellow: '#FFD500',
  yellowTint: '#FFE979',
  peach: '#FFF3E4',
  white: '#FFFFFF',
};

export const THEME_STYLES: Record<
  Exclude<WebBannerTheme, 'custom'>,
  { background: string; eyebrow: string; headline: string; body: string }
> = {
  indigo: {
    background: BRAND.indigo,
    eyebrow: BRAND.yellow,
    headline: BRAND.white,
    body: 'rgba(255,255,255,0.72)',
  },
  yellow: {
    background: BRAND.yellow,
    eyebrow: BRAND.indigo,
    headline: BRAND.indigo,
    body: 'rgba(18,4,96,0.75)',
  },
  peach: {
    background: BRAND.peach,
    eyebrow: BRAND.orange,
    headline: BRAND.indigo,
    body: 'rgba(18,4,96,0.7)',
  },
};

const CTA_STYLES: Record<WebBannerCtaVariant, React.CSSProperties> = {
  primary: { background: BRAND.indigo, color: BRAND.white, border: 'none' },
  accent: { background: BRAND.orange, color: BRAND.white, border: 'none' },
  outline: {
    background: 'transparent',
    color: BRAND.indigo,
    border: `1.5px solid ${BRAND.indigo}`,
  },
};

export interface BannerPreviewValue {
  mode: WebBannerMode;
  eyebrow?: string;
  headline?: string;
  subheadline?: string;
  ctaLabel?: string;
  ctaVariant: WebBannerCtaVariant;
  theme: WebBannerTheme;
  backgroundColor?: string;
  textColor?: string;
  imageUrl?: string;
  imageAlt?: string;
}

export function BannerPreview({ value }: { value: BannerPreviewValue }) {
  if (value.mode === 'image') {
    return (
      <div
        className="relative flex aspect-[1436/526] w-full items-center justify-center overflow-hidden rounded-[10px] bg-muted"
        aria-label="Banner preview"
      >
        {value.imageUrl ? (
          // Cloudinary URL rendered raw — this is a preview, not a page asset.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value.imageUrl}
            alt={value.imageAlt || 'Banner preview'}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-sm text-muted-foreground">
            Upload artwork to preview
          </span>
        )}
      </div>
    );
  }

  const themed =
    value.theme === 'custom'
      ? {
          background: value.backgroundColor || BRAND.indigo,
          eyebrow: value.textColor || BRAND.white,
          headline: value.textColor || BRAND.white,
          body: value.textColor || 'rgba(255,255,255,0.72)',
        }
      : THEME_STYLES[value.theme];

  return (
    <div
      className="relative flex aspect-[1436/526] w-full items-center overflow-hidden rounded-[10px] px-[8%]"
      style={{ background: themed.background }}
      aria-label="Banner preview"
    >
      {value.theme === 'yellow' && (
        <span
          aria-hidden
          className="absolute -right-[60px] -top-[40px] h-[320px] w-[320px] rotate-[24deg]"
          style={{ background: BRAND.yellowTint }}
        />
      )}

      <div className="relative max-w-[58%]">
        {value.eyebrow && (
          <div
            className="text-[11px] font-semibold tracking-[0.08em]"
            style={{ color: themed.eyebrow }}
          >
            {value.eyebrow}
          </div>
        )}
        <div
          className="mt-2.5 text-[clamp(18px,3.4vw,34px)] font-extrabold leading-[1.02] tracking-[-0.04em]"
          style={{ color: themed.headline }}
        >
          {value.headline || 'Your headline goes here'}
        </div>
        {value.subheadline && (
          <div
            className="mt-2 text-[13px] leading-snug"
            style={{ color: themed.body }}
          >
            {value.subheadline}
          </div>
        )}
        {value.ctaLabel && (
          <div className="mt-3.5">
            <span
              className="inline-block rounded-[30px] px-[22px] py-2 text-[13px] font-semibold"
              style={CTA_STYLES[value.ctaVariant]}
            >
              {value.ctaLabel}
            </span>
          </div>
        )}
      </div>

      {value.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value.imageUrl}
          alt={value.imageAlt || ''}
          className="absolute bottom-0 right-[5%] h-[88%] object-contain"
        />
      )}
    </div>
  );
}
