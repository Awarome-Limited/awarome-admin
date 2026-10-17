import { ReactNode } from 'react';

/** One label/value line in a facts card; the value sits right-aligned. */
export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2.5 text-[14px] first:pt-0 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right tabular-nums">{value ?? '—'}</span>
    </div>
  );
}
