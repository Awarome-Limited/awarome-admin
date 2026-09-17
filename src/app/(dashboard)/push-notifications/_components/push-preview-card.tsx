/** A notification as it lands on a phone's lock screen. */
export function PushPreviewCard({
  title,
  body,
  when = 'now',
}: {
  title: string;
  body: string;
  when?: string;
}) {
  return (
    <div className="flex gap-3 rounded-[14px] border border-border bg-card p-[13px_14px] shadow-[0_4px_14px_rgba(20,22,42,0.10)]">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[9px]">
        <img src="/white_logo.svg" alt="Awarome" className="h-9 w-9 object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-[3px] flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[.02em] text-muted-foreground">
            Awarome
          </span>
          <span className="text-[11px] text-muted-foreground">{when}</span>
        </div>
        <div className="break-words text-[13.5px] font-bold leading-[1.35] text-foreground">
          {title || (
            <span className="font-normal text-muted-foreground">e.g. New feature available!</span>
          )}
        </div>
        <div className="mt-0.5 break-words text-[12.5px] leading-[1.45] text-foreground-secondary">
          {body || (
            <span className="text-muted-foreground">Write your notification message here…</span>
          )}
        </div>
      </div>
    </div>
  );
}
