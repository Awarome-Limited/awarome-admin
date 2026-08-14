'use client';

import { useState, useTransition } from 'react';
import { PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type {
  AdminWebBanner,
  WebBannerCtaVariant,
  WebBannerLinkType,
  WebBannerMode,
  WebBannerTheme,
} from '@/lib/types';
import { BannerPreview } from './banner-preview';
import {
  createWebBanner,
  updateWebBanner,
  uploadBannerImage,
  type WebBannerPayload,
} from '../actions';

const selectClass =
  'h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

const MODES: { key: WebBannerMode; label: string; hint: string }[] = [
  { key: 'structured', label: 'Structured', hint: 'Text + CTA on a brand background' },
  { key: 'image', label: 'Full image', hint: 'One pre-composed artwork' },
];

const THEMES: WebBannerTheme[] = ['indigo', 'yellow', 'peach', 'custom'];
const CTA_VARIANTS: WebBannerCtaVariant[] = ['primary', 'accent', 'outline'];
const LINK_TYPES: { key: WebBannerLinkType; label: string; hint: string }[] = [
  { key: 'none', label: 'No link', hint: '' },
  { key: 'vendor', label: 'Vendor', hint: 'Vendor id' },
  { key: 'category', label: 'Category', hint: 'Category id' },
  { key: 'product', label: 'Product', hint: 'Product id' },
  { key: 'url', label: 'Custom URL', hint: 'https://…' },
];

function toDateInput(value?: string) {
  return value ? value.slice(0, 10) : '';
}

export function WebBannerDialog({ banner }: { banner?: AdminWebBanner }) {
  const isEdit = Boolean(banner);

  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);

  const [mode, setMode] = useState<WebBannerMode>(banner?.mode ?? 'structured');
  const [theme, setTheme] = useState<WebBannerTheme>(banner?.theme ?? 'indigo');
  const [ctaVariant, setCtaVariant] = useState<WebBannerCtaVariant>(
    banner?.ctaVariant ?? 'primary'
  );
  const [linkType, setLinkType] = useState<WebBannerLinkType>(
    banner?.linkType ?? 'none'
  );

  const [eyebrow, setEyebrow] = useState(banner?.eyebrow ?? '');
  const [headline, setHeadline] = useState(banner?.headline ?? '');
  const [subheadline, setSubheadline] = useState(banner?.subheadline ?? '');
  const [ctaLabel, setCtaLabel] = useState(banner?.ctaLabel ?? '');
  const [backgroundColor, setBackgroundColor] = useState(
    banner?.backgroundColor ?? '#120460'
  );
  const [textColor, setTextColor] = useState(banner?.textColor ?? '#FFFFFF');
  const [imageUrl, setImageUrl] = useState(banner?.imageUrl ?? '');
  const [imageAlt, setImageAlt] = useState(banner?.imageAlt ?? '');

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setIsUploading(true);
    try {
      const data = new FormData();
      data.append('upload', file, file.name);
      setImageUrl(await uploadBannerImage(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed.');
    } finally {
      setIsUploading(false);
    }
  }

  function handleSubmit(formData: FormData) {
    setError(null);

    if (mode === 'structured' && !headline.trim()) {
      setError('A headline is required for structured banners.');
      return;
    }
    if (mode === 'image' && !imageUrl) {
      setError('Upload artwork for a full-image banner.');
      return;
    }

    const linkValue = formData.get('linkValue')?.toString().trim() ?? '';
    if (linkType !== 'none' && !linkValue) {
      setError('This link type needs a target.');
      return;
    }

    const startsAt = formData.get('startsAt')?.toString();
    const endsAt = formData.get('endsAt')?.toString();

    const payload: WebBannerPayload = {
      mode,
      theme,
      ctaVariant,
      linkType,
      linkValue: linkType === 'none' ? '' : linkValue,
      eyebrow: eyebrow.trim(),
      headline: headline.trim(),
      subheadline: subheadline.trim(),
      ctaLabel: ctaLabel.trim(),
      imageUrl,
      imageAlt: imageAlt.trim(),
      backgroundColor: theme === 'custom' ? backgroundColor : '',
      textColor: theme === 'custom' ? textColor : '',
      startsAt: startsAt || null,
      endsAt: endsAt || null,
    };

    startTransition(async () => {
      try {
        if (banner) {
          await updateWebBanner(banner._id, payload);
        } else {
          await createWebBanner(payload);
        }
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save banner.');
      }
    });
  }

  const linkHint = LINK_TYPES.find((l) => l.key === linkType)?.hint;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button size="sm" variant={isEdit ? 'outline' : 'default'} />}
      >
        {isEdit ? 'Edit' : <><PlusIcon data-icon="inline-start" />Create web banner</>}
      </DialogTrigger>
      <DialogContent className="max-w-[720px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit web banner' : 'Create web banner'}</DialogTitle>
          <DialogDescription>
            Shown in the homepage hero on awarome.com. Mobile app banners are unaffected.
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4">
          <BannerPreview
            value={{
              mode,
              eyebrow,
              headline,
              subheadline,
              ctaLabel,
              ctaVariant,
              theme,
              backgroundColor,
              textColor,
              imageUrl,
              imageAlt,
            }}
          />
        </div>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Banner type</Label>
            <div className="flex gap-2">
              {MODES.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMode(m.key)}
                  className={`flex-1 rounded-[10px] border px-2 py-2 text-xs font-semibold ${
                    mode === m.key
                      ? 'border-primary bg-brand-tint2 text-primary'
                      : 'border-input text-muted-foreground'
                  }`}
                >
                  {m.label}
                  <span className="mt-0.5 block text-[10px] font-normal opacity-70">
                    {m.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {mode === 'structured' && (
            <>
              <div className="grid grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="eyebrow">Eyebrow</Label>
                  <Input
                    id="eyebrow"
                    value={eyebrow}
                    onChange={(e) => setEyebrow(e.target.value)}
                    placeholder="PAYDAY APPLIANCE SALE"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ctaLabel">CTA label</Label>
                  <Input
                    id="ctaLabel"
                    value={ctaLabel}
                    onChange={(e) => setCtaLabel(e.target.value)}
                    placeholder="Order now"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="headline">Headline</Label>
                <Input
                  id="headline"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Up To 30% Off Big Appliances"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="subheadline">Subheadline (optional)</Label>
                <Input
                  id="subheadline"
                  value={subheadline}
                  onChange={(e) => setSubheadline(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="theme">Theme</Label>
                  <select
                    id="theme"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as WebBannerTheme)}
                    className={selectClass}
                  >
                    {THEMES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ctaVariant">CTA style</Label>
                  <select
                    id="ctaVariant"
                    value={ctaVariant}
                    onChange={(e) =>
                      setCtaVariant(e.target.value as WebBannerCtaVariant)
                    }
                    className={selectClass}
                  >
                    {CTA_VARIANTS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {theme === 'custom' && (
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="backgroundColor">Background</Label>
                    <Input
                      id="backgroundColor"
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="textColor">Text colour</Label>
                    <Input
                      id="textColor"
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="image">
              {mode === 'image' ? 'Artwork' : 'Cut-out image (optional)'}
            </Label>
            <input
              id="image"
              type="file"
              accept="image/*"
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border file:border-input file:bg-transparent file:px-3 file:py-1.5 file:text-sm"
            />
            {isUploading && (
              <span className="text-xs text-muted-foreground">Uploading…</span>
            )}
            {imageUrl && !isUploading && (
              <div className="flex items-center gap-2">
                <span className="truncate text-xs text-muted-foreground">
                  {imageUrl}
                </span>
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="text-xs font-semibold text-destructive"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {imageUrl && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="imageAlt">Image alt text</Label>
              <Input
                id="imageAlt"
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                placeholder="Describe the image for screen readers"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="linkType">Links to</Label>
              <select
                id="linkType"
                value={linkType}
                onChange={(e) =>
                  setLinkType(e.target.value as WebBannerLinkType)
                }
                className={selectClass}
              >
                {LINK_TYPES.map((l) => (
                  <option key={l.key} value={l.key}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            {linkType !== 'none' && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="linkValue">Target</Label>
                <Input
                  id="linkValue"
                  name="linkValue"
                  defaultValue={banner?.linkValue ?? ''}
                  placeholder={linkHint}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="startsAt">Starts (optional)</Label>
              <Input
                id="startsAt"
                name="startsAt"
                type="date"
                defaultValue={toDateInput(banner?.startsAt)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="endsAt">Ends (optional)</Label>
              <Input
                id="endsAt"
                name="endsAt"
                type="date"
                defaultValue={toDateInput(banner?.endsAt)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || isUploading}>
              {isEdit ? 'Save changes' : 'Create banner'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
