import { AlertTriangle } from 'lucide-react';

export function ApiErrorCard({ message }: { message: string }) {
  return (
    <section className="flex flex-col items-center gap-2 rounded-[10px] border border-border bg-card px-6 py-14 text-center">
      <AlertTriangle className="size-5 text-warning" />
      <span className="font-heading text-[18px] font-bold tracking-[-0.03em]">
        Couldn’t load this page
      </span>
      <span className="max-w-[52ch] text-[14px] text-foreground-secondary">
        {message} Refresh to try again.
      </span>
    </section>
  );
}
