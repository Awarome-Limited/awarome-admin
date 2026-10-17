import type { BatchStatus } from '@/lib/types';

const STATUS_LABELS: Record<BatchStatus, string> = {
  offered: 'On offer',
  assigned: 'Assigned',
  'in-progress': 'In progress',
  completed: 'Completed',
  partial: 'Partial',
  dissolved: 'Dissolved',
  unassigned: 'Unassigned',
};

const STATUS_VARIANTS: Record<
  BatchStatus,
  'positive' | 'warning' | 'info' | 'destructive' | 'secondary'
> = {
  // Stages are indigo; only outcomes that need someone get orange or red.
  offered: 'info',
  assigned: 'info',
  'in-progress': 'info',
  completed: 'positive',
  partial: 'warning',
  dissolved: 'secondary',
  unassigned: 'destructive',
};

export function batchStatusLabel(status: string) {
  return STATUS_LABELS[status as BatchStatus] ?? status;
}

export function batchStatusVariant(status: string) {
  return STATUS_VARIANTS[status as BatchStatus] ?? 'secondary';
}

export function riderDisplayName(rider?: { firstName?: string; lastName?: string } | null) {
  return [rider?.firstName, rider?.lastName].filter(Boolean).join(' ') || 'Unnamed courier';
}
