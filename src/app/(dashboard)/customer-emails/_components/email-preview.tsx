'use client';

/**
 * Mirrors the branded shell the backend wraps every send in — same indigo
 * header, same paragraph rules, same footer line. Worth keeping in step with
 * `renderCustomerEmail` in awarome-BE: the point of the panel is that what is
 * shown here is what lands in the inbox.
 */
export function EmailPreview({
  subject,
  body,
  ctaLabel,
  ctaUrl,
  sampleFirstName,
}: {
  subject: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  sampleFirstName: string;
}) {
  const withName = (text: string) =>
    text.replace(/\{\{\s*firstName\s*\}\}/g, sampleFirstName);

  const paragraphs = withName(body)
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className="flex flex-col rounded-[14px] border border-border bg-card p-[22px_24px] shadow-[var(--shadow-card)]">
      <div className="mb-1.5 text-[15px] font-semibold text-foreground">Preview</div>
      <div className="mb-[18px] text-[12.5px] text-muted-foreground">
        Exactly what lands in the inbox.
      </div>

      <div className="rounded-[12px] bg-[#f3f3f3] p-3.5">
        <div className="mb-2.5 flex flex-col gap-0.5 px-1">
          <span className="text-[11px] font-semibold uppercase tracking-[.03em] text-[#8a8a95]">
            Subject
          </span>
          <span className="break-words text-[13px] font-bold text-[#111111]">
            {withName(subject) || (
              <span className="font-normal text-[#9a9aa5]">No subject yet</span>
            )}
          </span>
        </div>

        <div className="overflow-hidden rounded-[6px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <div className="bg-[#16008b] px-5 py-[22px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/white_logo.svg" alt="Awarome" className="h-6 w-auto" />
          </div>

          <div className="px-5 py-7">
            {paragraphs.length === 0 ? (
              <p className="text-[13px] leading-[1.6] text-[#9a9aa5]">
                Your message will appear here…
              </p>
            ) : (
              paragraphs.map((block, index) => (
                <p
                  key={index}
                  className="mb-4 whitespace-pre-line text-[13px] leading-[1.6] text-[#444444] last:mb-0"
                >
                  {block}
                </p>
              ))
            )}

            {ctaLabel && ctaUrl && (
              <span className="mt-5 inline-block rounded-[5px] bg-[#16008b] px-6 py-3 text-[13px] font-semibold text-white">
                {ctaLabel}
              </span>
            )}
          </div>

          <div className="border-t border-[#eeeeee] bg-[#fafafa] px-5 py-4">
            <p className="text-[11px] leading-[1.5] text-[#999999]">
              Need anything else? Just reply to this email and the Awarome
              support team will pick it up.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
