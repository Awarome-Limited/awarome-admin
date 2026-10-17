'use client';

/**
 * Floating save bar (DESIGN.md §4): appears only while a form is dirty, so
 * nobody has to remember a static Save button. Indigo pill, bottom centre.
 */
export function SaveBar({
  dirty,
  label,
  saving = false,
  onDiscard,
  onSave,
  form,
}: {
  dirty: boolean;
  label: string;
  saving?: boolean;
  onDiscard: () => void;
  /** Click handler; omit when the Save button submits `form`. */
  onSave?: () => void;
  /** The id of the <form> the Save button submits. */
  form?: string;
}) {
  if (!dirty && !saving) return null;
  return (
    <div
      role="region"
      aria-label="Unsaved changes"
      className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-[#120460] py-2 pr-2 pl-5 text-[13.5px] whitespace-nowrap text-white shadow-[0_12px_32px_rgba(18,4,96,0.35)] lg:left-[calc(50%+124px)] dark:bg-[#070418] dark:ring-1 dark:ring-white/10"
    >
      <span className="size-2 rounded-full bg-[#FFD500]" />
      <span>{label}</span>
      <button
        type="button"
        onClick={onDiscard}
        disabled={saving}
        className="h-9 rounded-full px-3.5 text-white/75 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
      >
        Discard
      </button>
      <button
        type={form ? 'submit' : 'button'}
        form={form}
        onClick={onSave}
        disabled={saving}
        className="h-9 rounded-full bg-[#FFD500] px-4 font-semibold text-[#120460] transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}
