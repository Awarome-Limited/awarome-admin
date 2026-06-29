'use client';

import { useTransition, useRef, useState } from 'react';
import { toast } from 'sonner';

export function ReplaceCSVForm({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [fileName, setFileName] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await action(formData);
        toast.success('Phone list replaced and users re-matched.');
        formRef.current?.reset();
        setFileName('');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to replace phone list.');
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-[9px] rounded-[12px] border-[1.5px] border-dashed border-input bg-background p-[18px_16px] text-center transition-colors hover:border-primary hover:bg-brand-tint">
        <span className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-input bg-card text-primary">
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M17 8l-5-5-5 5" />
            <path d="M12 3v12" />
          </svg>
        </span>
        <span className="text-[13px] font-semibold text-foreground">
          {fileName ? (
            fileName
          ) : (
            <>
              Drop CSV here or <span className="text-primary">browse</span>
            </>
          )}
        </span>
        <span className="text-[11.5px] text-muted-foreground">
          One number per line · header "phone" is skipped
        </span>
        <input
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="sr-only"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
        />
      </label>
      <button
        type="submit"
        disabled={isPending || !fileName}
        className="self-start rounded-[10px] bg-primary px-[18px] py-[9px] text-[13px] font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
      >
        {isPending ? 'Replacing…' : 'Replace phone list'}
      </button>
    </form>
  );
}
