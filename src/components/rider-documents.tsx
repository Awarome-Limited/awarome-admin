'use client';

import { useState } from 'react';
import { ExternalLinkIcon, FileTextIcon, ImageOffIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AdminRiderDocuments } from '@/lib/types';
import { cn } from '@/lib/utils';

const DOCUMENT_LABELS: { key: keyof AdminRiderDocuments; label: string }[] = [
  { key: 'govId', label: 'Government ID' },
  { key: 'license', label: "Driver's licence" },
  { key: 'vehiclePapers', label: 'Vehicle papers' },
];

// Uploads are images in practice, but a rider can send a PDF scan. Anything
// non-image opens in a new tab instead of rendering inline.
const isImage = (url: string) =>
  /\.(png|jpe?g|webp|gif|avif|heic|heif)(\?|#|$)/i.test(url) ||
  // Cloudinary delivery URLs often carry no extension.
  /\/image\/upload\//.test(url);

interface DocEntry {
  key: string;
  label: string;
  url: string;
}

function entriesOf(documents?: AdminRiderDocuments): DocEntry[] {
  if (!documents) return [];
  return DOCUMENT_LABELS.flatMap(({ key, label }) => {
    const url = documents[key]?.trim();
    return url ? [{ key, label, url }] : [];
  });
}

export function riderDocumentCount(documents?: AdminRiderDocuments): number {
  return entriesOf(documents).length;
}

/** Full document set with labels — for the rider details screen. */
export function RiderDocuments({
  documents,
  className,
}: {
  documents?: AdminRiderDocuments;
  className?: string;
}) {
  const [active, setActive] = useState<DocEntry | null>(null);
  const entries = entriesOf(documents);

  if (!entries.length) {
    return (
      <p className="text-[13px] text-muted-foreground">
        This rider hasn&apos;t uploaded any verification documents yet.
      </p>
    );
  }

  return (
    <>
      <div
        className={cn(
          'grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(180px,1fr))]',
          className
        )}
      >
        {DOCUMENT_LABELS.map(({ key, label }) => {
          const entry = entries.find((e) => e.key === key);
          return (
            <div key={key} className="flex flex-col gap-2">
              <span className="text-[12px] font-medium text-foreground-secondary">
                {label}
              </span>
              {entry ? (
                <DocumentThumb
                  entry={entry}
                  onOpen={() => setActive(entry)}
                  className="h-[130px]"
                />
              ) : (
                <div className="flex h-[130px] items-center justify-center rounded-[12px] border border-dashed border-border text-[12px] text-muted-foreground">
                  Not uploaded
                </div>
              )}
            </div>
          );
        })}
      </div>

      <DocumentLightbox entry={active} onClose={() => setActive(null)} />
    </>
  );
}

/** Compact thumbnail strip — for dense contexts like the approvals table. */
export function RiderDocumentsStrip({
  documents,
}: {
  documents?: AdminRiderDocuments;
}) {
  const [active, setActive] = useState<DocEntry | null>(null);
  const entries = entriesOf(documents);

  if (!entries.length) {
    return <span className="text-[12px] text-muted-foreground">None</span>;
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        {entries.map((entry) => (
          <DocumentThumb
            key={entry.key}
            entry={entry}
            onOpen={() => setActive(entry)}
            className="size-9"
            compact
          />
        ))}
      </div>

      <DocumentLightbox entry={active} onClose={() => setActive(null)} />
    </>
  );
}

function DocumentThumb({
  entry,
  onOpen,
  className,
  compact = false,
}: {
  entry: DocEntry;
  onOpen: () => void;
  className?: string;
  compact?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const renderable = isImage(entry.url) && !failed;

  // Non-images (and anything that failed to load) can't be previewed — send the
  // reviewer straight to the file rather than showing a broken box.
  if (!renderable) {
    return (
      <a
        href={entry.url}
        target="_blank"
        rel="noopener noreferrer"
        title={`Open ${entry.label}`}
        className={cn(
          'flex flex-col items-center justify-center gap-1 rounded-[12px] border border-border bg-muted text-muted-foreground transition-colors hover:bg-chip hover:text-foreground',
          className
        )}
      >
        {failed ? (
          <ImageOffIcon className="size-4" />
        ) : (
          <FileTextIcon className="size-4" />
        )}
        {!compact && (
          <span className="text-[11px] font-medium">
            {failed ? 'Preview failed — open' : 'Open file'}
          </span>
        )}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      title={`View ${entry.label}`}
      className={cn(
        'group relative overflow-hidden rounded-[12px] border border-border bg-muted transition-colors hover:border-primary/50',
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={entry.url}
        alt={entry.label}
        loading="lazy"
        onError={() => setFailed(true)}
        className="size-full object-cover"
      />
    </button>
  );
}

function DocumentLightbox({
  entry,
  onClose,
}: {
  entry: DocEntry | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!entry} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{entry?.label}</DialogTitle>
        </DialogHeader>
        {entry && (
          <div className="flex flex-col gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={entry.url}
              alt={entry.label}
              className="max-h-[70vh] w-full rounded-[12px] object-contain"
            />
            <a
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 self-start text-[13px] font-semibold text-primary hover:underline"
            >
              <ExternalLinkIcon className="size-3.5" />
              Open full size in a new tab
            </a>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
