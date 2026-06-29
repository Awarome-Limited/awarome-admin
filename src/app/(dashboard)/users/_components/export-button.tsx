'use client';

import { useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { exportUsers } from '../actions';

function toCsv(rows: Record<string, string>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return [
    headers.map(escape).join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h] ?? '')).join(',')),
  ].join('\r\n');
}

function download(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportButton() {
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();

  function handleExport() {
    startTransition(async () => {
      try {
        const rows = await exportUsers({
          search: searchParams.get('search') ?? undefined,
          filter: searchParams.get('filter') ?? undefined,
          dateFrom: searchParams.get('dateFrom') ?? undefined,
          dateTo: searchParams.get('dateTo') ?? undefined,
        });

        if (!rows.length) {
          toast.info('No users match the current filters.');
          return;
        }

        const csv = toCsv(
          rows.map((r) => ({
            'Customer name': r.name,
            'Phone': r.phone,
            'Email': r.email,
            'Source': r.source,
            'Signup date': r.signupDate,
          }))
        );

        const date = new Date().toISOString().slice(0, 10);
        download(csv, `users-export-${date}.csv`);
        toast.success(`Exported ${rows.length} users.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Export failed.');
      }
    });
  }

  return (
    <button
      onClick={handleExport}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 rounded-[9px] border border-border-strong bg-card px-3.5 py-[7px] text-[13px] font-semibold text-foreground-secondary transition-colors hover:bg-muted disabled:opacity-50"
    >
      {isPending ? (
        'Exporting…'
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export CSV
        </>
      )}
    </button>
  );
}
