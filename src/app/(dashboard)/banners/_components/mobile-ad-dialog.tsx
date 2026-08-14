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
import { createMobileAd, uploadBannerImage } from '../actions';

export function MobileAdDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [bannerImage, setBannerImage] = useState('');

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setIsUploading(true);
    try {
      const data = new FormData();
      data.append('upload', file, file.name);
      setBannerImage(await uploadBannerImage(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed.');
    } finally {
      setIsUploading(false);
    }
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    const vendor = formData.get('vendor')?.toString().trim();

    // The Flutter app reads `vendor` into a non-nullable String and taps
    // through to /vendors/:id, so an ad without one would crash the app.
    if (!vendor) {
      setError('A vendor id is required — the mobile app links the banner to it.');
      return;
    }
    if (!bannerImage) {
      setError('Upload a banner image.');
      return;
    }

    startTransition(async () => {
      try {
        await createMobileAd({ vendor, bannerImage });
        setOpen(false);
        setBannerImage('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create ad.');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <PlusIcon data-icon="inline-start" />
        Create mobile ad
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create mobile ad</DialogTitle>
          <DialogDescription>
            Shown in the app&apos;s home carousel. One ad per vendor.
          </DialogDescription>
        </DialogHeader>

        {bannerImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bannerImage}
            alt="Mobile ad preview"
            className="aspect-[1436/526] w-full rounded-[10px] object-cover"
          />
        )}

        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="vendor">Vendor id</Label>
            <Input
              id="vendor"
              name="vendor"
              placeholder="24-character vendor id"
              className="font-mono"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="mobileImage">Banner image</Label>
            <input
              id="mobileImage"
              type="file"
              accept="image/*"
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border file:border-input file:bg-transparent file:px-3 file:py-1.5 file:text-sm"
            />
            {isUploading && (
              <span className="text-xs text-muted-foreground">Uploading…</span>
            )}
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
              Create ad
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
