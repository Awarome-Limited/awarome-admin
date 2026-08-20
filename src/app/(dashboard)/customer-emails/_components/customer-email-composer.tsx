'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  applyPlaceholders,
  extractPlaceholders,
  placeholderLabel,
  type EmailPreset,
} from '@/lib/email-presets';
import { sendCustomerEmail, type EmailRecipient, type SendCustomerEmailData } from '../actions';
import { PresetPicker } from './preset-picker';
import { RecipientPicker } from './recipient-picker';
import { EmailPreview } from './email-preview';

const MAX_BODY = 5000;

const inputClass =
  'w-full rounded-[10px] border border-input bg-background px-[14px] py-[11px] text-[14px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50';

export function CustomerEmailComposer() {
  const [presetId, setPresetId] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [showCta, setShowCta] = useState(false);
  const [fills, setFills] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SendCustomerEmailData | null>(null);
  const [isPending, startTransition] = useTransition();

  // Read straight out of the current text, so hand-edited presets and custom
  // emails get the same fill-in panel as an untouched preset.
  const placeholders = extractPlaceholders(subject, body);
  const unfilled = placeholders.filter((key) => !fills[key]?.trim());

  const resolvedSubject = applyPlaceholders(subject, fills);
  const resolvedBody = applyPlaceholders(body, fills);

  function applyPreset(preset: EmailPreset) {
    setPresetId(preset.id);
    setSubject(preset.subject);
    setBody(preset.body);
    setFills({});
    setResult(null);
    setShowCta(!!preset.cta);
    setCtaLabel(preset.cta?.label ?? '');
    setCtaUrl(preset.cta?.url ?? '');
  }

  function clearPreset() {
    setPresetId(null);
    setSubject('');
    setBody('');
    setFills({});
    setResult(null);
    setShowCta(false);
    setCtaLabel('');
    setCtaUrl('');
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
    if (showCta && (!!ctaLabel.trim() !== !!ctaUrl.trim())) {
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
        presetId: presetId ?? 'custom',
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

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_350px]">
      <PresetPicker
        selectedId={presetId}
        onSelect={applyPreset}
        onClear={clearPreset}
      />

      <div className="flex flex-col gap-[18px] rounded-[14px] border border-border bg-card p-[22px_24px] shadow-[var(--shadow-card)]">
        <div className="text-[15px] font-semibold text-foreground">Compose</div>

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
            “there” when we don’t have one on file.
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
    </div>
  );
}
