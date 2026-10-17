'use client';

import { useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { downloadCsv, toCsv } from '@/lib/csv';
import { exportUsers } from '../actions';
import { Button } from '@/components/ui/button';

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
        downloadCsv(csv, `users-export-${date}.csv`);
        toast.success(`Exported ${rows.length} users.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Export failed.');
      }
    });
  }

  return (
    <Button variant="outline" onClick={handleExport} loading={isPending}>
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
    </Button>
  );
}
