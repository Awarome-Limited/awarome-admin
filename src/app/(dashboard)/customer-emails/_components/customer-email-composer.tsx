'use client';

import { useState, useTransition } from 'react';
import { BookmarkPlus } from 'lucide-react';
import { toast } from 'sonner';
import {
  applyPlaceholders,
  extractPlaceholders,
  placeholderLabel,
  templateIdFromKey,
  templateKey,
  type EmailPreset,
  type EmailPresetCategory,
} from '@/lib/email-presets';
import {
  sendCustomerEmail,
  type EmailRecipient,
  type SavedEmailTemplate,
  type SendCustomerEmailData,
} from '../actions';
import { PresetPicker } from './preset-picker';
import { RecipientPicker } from './recipient-picker';
import { EmailPreview } from './email-preview';
import { SaveTemplateDialog } from './save-template-dialog';

const MAX_BODY = 5000;

const inputClass =
  'w-full rounded-[10px] border border-input bg-background px-[14px] py-[11px] text-[14px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50';

export function CustomerEmailComposer({
  initialTemplates,
}: {
  initialTemplates: SavedEmailTemplate[];
}) {
  const [templates, setTemplates] = useState<SavedEmailTemplate[]>(initialTemplates);
  // Null means "custom email". Otherwise a built-in preset id, or a saved
  // template's prefixed key — one selection for one picker.
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [lastCategory, setLastCategory] = useState<EmailPresetCategory>('Delivery');
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [showCta, setShowCta] = useState(false);
  const [fills, setFills] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SendCustomerEmailData | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const openTemplateId = selectedKey ? templateIdFromKey(selectedKey) : null;
  const openTemplate =
    templates.find((template) => template._id === openTemplateId) ?? null;

  // Read straight out of the current text, so hand-edited presets and custom
  // emails get the same fill-in panel as an untouched preset.
  const placeholders = extractPlaceholders(subject, body);
  const unfilled = placeholders.filter((key) => !fills[key]?.trim());

  const resolvedSubject = applyPlaceholders(subject, fills);
  const resolvedBody = applyPlaceholders(body, fills);

  function load(source: {
    subject: string;
    body: string;
    ctaLabel?: string;
    ctaUrl?: string;
  }) {
    setSubject(source.subject);
    setBody(source.body);
    setFills({});
    setResult(null);
    const hasCta = !!(source.ctaLabel && source.ctaUrl);
    setShowCta(hasCta);
    setCtaLabel(source.ctaLabel ?? '');
    setCtaUrl(source.ctaUrl ?? '');
  }

  function applyPreset(preset: EmailPreset) {
    setSelectedKey(preset.id);
    setLastCategory(preset.category);
    load({
      subject: preset.subject,
      body: preset.body,
      ctaLabel: preset.cta?.label,
      ctaUrl: preset.cta?.url,
    });
  }

  function applyTemplate(template: SavedEmailTemplate) {
    setSelectedKey(templateKey(template._id));
    setLastCategory(template.category);
    load(template);
  }

  function clearPreset() {
    setSelectedKey(null);
    load({ subject: '', body: '' });
  }

  function handleTemplateSaved(template: SavedEmailTemplate) {
    setTemplates((prev) => {
      const without = prev.filter((existing) => existing._id !== template._id);
      return [...without, template];
    });
    // Selecting what was just saved makes the next edit an update rather than
    // an accidental second copy.
    setSelectedKey(templateKey(template._id));
    setLastCategory(template.category);
  }

  function handleTemplateDeleted(id: string) {
    setTemplates((prev) => prev.filter((template) => template._id !== id));
    // The copy stays in the composer — deleting the template shouldn't wipe an
    // email that is halfway to being sent.
    if (selectedKey === templateKey(id)) setSelectedKey(null);
  }

  function handleSend() {
    if (recipients.length === 0) {
      toast.error('Add at least one recipient.');
      return;
    }
    if (!resolvedSubject.trim() || !resolvedBody.trim()) {
      toast.error('Subject and message are both required.');
      return;
    }
    // Without this a customer receives a literal "{{destination}}", which reads
    // worse than the problem the email was written to apologise for.
    if (unfilled.length > 0) {
      toast.error(
        `Fill in ${unfilled.map(placeholderLabel).join(', ')} before sending.`
      );
      return;
    }
    if (showCta && !!ctaLabel.trim() !== !!ctaUrl.trim()) {
      toast.error('A button needs both a label and a link.');
      return;
    }

    setResult(null);
    startTransition(async () => {
      const response = await sendCustomerEmail({
        recipients,
        subject: resolvedSubject.trim(),
        body: resolvedBody.trim(),
        ctaLabel: showCta ? ctaLabel.trim() : undefined,
        ctaUrl: showCta ? ctaUrl.trim() : undefined,
        presetId: selectedKey ?? 'custom',
      });

      if (!response.ok) {
        toast.error(response.error);
        return;
      }

      setResult(response);
      toast.success(
        `Queued ${response.queued} email${response.queued === 1 ? '' : 's'}.`
      );
      // The copy stays put deliberately — the same incident usually needs the
      // same email sent to the next customer, with only the recipients changed.
      setRecipients([]);
    });
  }

  const canSave = !!subject.trim() && !!body.trim();

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_350px]">
      <PresetPicker
        selectedKey={selectedKey}
        savedTemplates={templates}
        onSelectPreset={applyPreset}
        onSelectTemplate={applyTemplate}
        onClear={clearPreset}
        onDeleted={handleTemplateDeleted}
      />

      <div className="flex flex-col gap-[18px] rounded-[14px] border border-border bg-card p-[22px_24px] shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[15px] font-semibold text-foreground">Compose</span>
          <button
            type="button"
            onClick={() => setSaveOpen(true)}
            disabled={!canSave}
            title={
              canSave
                ? 'Save this copy as a reusable template'
                : 'Write a subject and message first'
            }
            className="inline-flex items-center gap-1.5 rounded-[9px] border border-border-strong bg-card px-3 py-[7px] text-[12.5px] font-semibold text-foreground-secondary transition-colors hover:bg-muted disabled:opacity-40 disabled:hover:bg-card"
          >
            <BookmarkPlus size={14} />
            {openTemplate ? 'Save template' : 'Save as template'}
          </button>
        </div>

        <RecipientPicker recipients={recipients} onChange={setRecipients} />

        <label className="flex flex-col gap-[7px]">
          <span className="text-[13px] font-medium text-foreground-secondary">
            Subject <span className="text-destructive">*</span>
          </span>
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="e.g. About your batch delivery"
            maxLength={200}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-[7px]">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-foreground-secondary">
              Message <span className="text-destructive">*</span>
            </span>
            <span className="tabular-nums text-[11.5px] text-muted-foreground">
              {body.length} / {MAX_BODY}
            </span>
          </div>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={
              'Hi {{firstName}},\n\nWrite the email here. Leave a blank line between paragraphs.'
            }
            maxLength={MAX_BODY}
            rows={16}
            className="w-full resize-y rounded-[10px] border border-input bg-background px-[14px] py-3 text-[14px] leading-[1.6] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            style={{ minHeight: '260px' }}
          />
          <span className="text-[11.5px] text-muted-foreground">
            {'{{firstName}}'} is replaced with each recipient’s own name — or
            “there” when we don’t have one on file. Wrap any other detail in{' '}
            {'{{ }}'} to turn it into a fill-in field.
          </span>
        </label>

        {placeholders.length > 0 && (
          <div className="flex flex-col gap-3 rounded-[10px] border border-border bg-muted/40 p-[14px_16px]">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[13px] font-semibold text-foreground">
                Details to fill in
              </span>
              <span className="text-[11.5px] text-muted-foreground">
                {unfilled.length === 0
                  ? 'All set'
                  : `${unfilled.length} still empty`}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {placeholders.map((key) => (
                <label key={key} className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-medium text-foreground-secondary">
                    {placeholderLabel(key)}
                  </span>
                  <input
                    value={fills[key] ?? ''}
                    onChange={(event) =>
                      setFills((prev) => ({ ...prev, [key]: event.target.value }))
                    }
                    placeholder={`{{${key}}}`}
                    className="w-full rounded-[9px] border border-input bg-background px-3 py-2 text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-[7px]">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={showCta}
              onChange={(event) => setShowCta(event.target.checked)}
              className="size-[15px] accent-[var(--primary)]"
            />
            <span className="text-[13px] font-medium text-foreground-secondary">
              Add a button
            </span>
          </label>
          {showCta && (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <input
                value={ctaLabel}
                onChange={(event) => setCtaLabel(event.target.value)}
                placeholder="Button label"
                maxLength={60}
                className={inputClass}
              />
              <input
                value={ctaUrl}
                onChange={(event) => setCtaUrl(event.target.value)}
                placeholder="https://awarome.com"
                className={inputClass}
              />
            </div>
          )}
        </div>

        {result && (
          <div className="flex flex-col gap-1.5 rounded-[10px] border border-border bg-muted/40 px-4 py-3 text-[13px]">
            <span>
              <span className="font-medium text-foreground">Last send: </span>
              <span className="text-muted-foreground">
                {result.queued} of {result.total} queued
              </span>
            </span>
            {result.failed.length > 0 && (
              <span className="text-[12.5px] text-destructive">
                Not sent: {result.failed.map((f) => f.email).join(', ')}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-border pt-[18px]">
          <span className="text-[12px] text-muted-foreground">
            {recipients.length === 0
              ? 'No recipients yet'
              : `Sending to ${recipients.length} customer${recipients.length === 1 ? '' : 's'}`}
          </span>
          <button
            type="button"
            onClick={handleSend}
            disabled={isPending}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-5 py-[11px] text-[13.5px] font-semibold text-primary-foreground shadow-[var(--shadow-card)] transition-all hover:brightness-110 disabled:opacity-50"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 4h16v16H4z" />
              <path d="M4 6l8 6 8-6" />
            </svg>
            {isPending ? 'Sending…' : 'Send email'}
          </button>
        </div>
      </div>

      <div className="xl:sticky xl:top-4">
        <EmailPreview
          subject={resolvedSubject}
          body={resolvedBody}
          ctaLabel={showCta ? ctaLabel : undefined}
          ctaUrl={showCta ? ctaUrl : undefined}
          sampleFirstName={recipients[0]?.firstName?.trim() || 'there'}
        />
      </div>

      <SaveTemplateDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        draft={{ subject, body, ctaLabel: showCta ? ctaLabel : '', ctaUrl: showCta ? ctaUrl : '' }}
        openTemplate={openTemplate}
        suggestedName={subject.trim().slice(0, 80)}
        suggestedCategory={lastCategory}
        onSaved={handleTemplateSaved}
      />
    </div>
  );
}
