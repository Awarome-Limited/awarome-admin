'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { EMAIL_PRESET_CATEGORIES, type EmailPresetCategory } from '@/lib/email-presets';
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
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  createEmailTemplate,
  updateEmailTemplate,
  type EmailTemplatePayload,
  type SavedEmailTemplate,
} from '../actions';

const selectClass =
  'w-full cursor-pointer appearance-none rounded-[10px] border border-input bg-background py-[9px] pl-3 pr-9 text-[13.5px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50';

export function SaveTemplateDialog({
  open,
  onOpenChange,
  draft,
  openTemplate,
  suggestedName,
  suggestedCategory,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The raw composer text — placeholders intact, details not yet filled in. */
  draft: { subject: string; body: string; ctaLabel?: string; ctaUrl?: string };
  /** The saved template currently loaded in the composer, if any. */
  openTemplate: SavedEmailTemplate | null;
  suggestedName: string;
  suggestedCategory: EmailPresetCategory;
  onSaved: (template: SavedEmailTemplate) => void;
}) {
  const [mode, setMode] = useState<'update' | 'new'>('update');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<EmailPresetCategory>('Delivery');
  const [summary, setSummary] = useState('');
  const [isPending, startTransition] = useTransition();

  // Re-seed during render when the dialog opens on a different draft, rather
  // than in an effect that would show one frame of the previous template's name.
  const seed = `${open}|${openTemplate?._id ?? ''}|${suggestedName}|${suggestedCategory}`;
  const [lastSeed, setLastSeed] = useState(seed);
  if (seed !== lastSeed) {
    setLastSeed(seed);
    if (open) {
      setMode(openTemplate ? 'update' : 'new');
      setName(openTemplate?.name ?? suggestedName);
      setCategory(openTemplate?.category ?? suggestedCategory);
      setSummary(openTemplate?.summary ?? '');
    }
  }

  const updating = mode === 'update' && !!openTemplate;

  function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('Give the template a name.');
      return;
    }
    if (!draft.subject.trim() || !draft.body.trim()) {
      toast.error('A template needs a subject and a message.');
      return;
    }

    const payload: EmailTemplatePayload = {
      name: trimmedName,
      category,
      summary: summary.trim(),
      subject: draft.subject.trim(),
      body: draft.body.trim(),
      // Always sent, so switching the button off clears it on the stored
      // template instead of leaving the old label behind.
      ctaLabel: draft.ctaLabel?.trim() ?? '',
      ctaUrl: draft.ctaUrl?.trim() ?? '',
    };

    if (!!payload.ctaLabel !== !!payload.ctaUrl) {
      toast.error('A button needs both a label and a link.');
      return;
    }

    startTransition(async () => {
      const result = updating
        ? await updateEmailTemplate(openTemplate!._id, payload)
        : await createEmailTemplate(payload);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      onSaved(result.template);
      onOpenChange(false);
      toast.success(
        updating ? `Updated “${result.template.name}”.` : `Saved “${result.template.name}”.`
      );
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as template</DialogTitle>
          <DialogDescription>
            The message is stored exactly as written — {'{{placeholders}}'} and
            all — so the details get filled in fresh each time it is used.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {openTemplate && (
            <div className="flex gap-2">
              {(
                [
                  { key: 'update' as const, label: `Update “${openTemplate.name}”` },
                  { key: 'new' as const, label: 'Save as new' },
                ]
              ).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    setMode(option.key);
                    if (option.key === 'new' && name === openTemplate.name) {
                      setName(`${openTemplate.name} (copy)`);
                    }
                    if (option.key === 'update') setName(openTemplate.name);
                  }}
                  className={cn(
                    'flex-1 truncate rounded-[10px] border px-2.5 py-2 text-xs font-semibold transition-colors',
                    mode === option.key
                      ? 'border-primary bg-brand-tint2 text-primary'
                      : 'border-input text-muted-foreground hover:bg-muted'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="template-name">Name</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Batch didn’t fill — Gwarinpa"
              maxLength={80}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="template-category">Category</Label>
            <div className="relative">
              <select
                id="template-category"
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as EmailPresetCategory)
                }
                className={selectClass}
              >
                {EMAIL_PRESET_CATEGORIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <svg
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="template-summary">Summary</Label>
            <Input
              id="template-summary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="One line describing when to use it"
              maxLength={160}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending
              ? 'Saving…'
              : updating
                ? 'Update template'
                : 'Save template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
