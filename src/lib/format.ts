export function formatDate(value?: string | Date | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const POSITIVE_STATUS_HINTS = [
  'confirmed',
  'delivered',
  'accepted',
  'online',
  'active',
  'paid',
  'success',
  'subscribed',
];
const WARNING_STATUS_HINTS = [
  'pending',
  'processing',
  'assigned',
  'initialized',
  'busy',
  'in-transit',
];
const NEGATIVE_STATUS_HINTS = [
  'failed',
  'cancelled',
  'rejected',
  'suspended',
  'declined',
  'offline',
  'expired',
  'refunded',
  'inactive',
];
const BRAND_STATUS_HINTS = ['super_admin', 'admin', 'vendoragent', 'featured'];

export function statusBadgeVariant(
  status?: string
): 'default' | 'secondary' | 'destructive' | 'outline' | 'positive' | 'warning' | 'info' {
  if (!status) return 'outline';
  const value = status.toLowerCase();
  if (BRAND_STATUS_HINTS.some((hint) => value.includes(hint))) return 'default';
  if (POSITIVE_STATUS_HINTS.some((hint) => value.includes(hint))) return 'positive';
  if (WARNING_STATUS_HINTS.some((hint) => value.includes(hint))) return 'warning';
  if (NEGATIVE_STATUS_HINTS.some((hint) => value.includes(hint))) return 'destructive';
  return 'secondary';
}

// Wallet/transaction balances are stored in kobo on the BE.
export function formatNaira(kobo?: number) {
  if (kobo === undefined || kobo === null) return '—';
  return `₦${(kobo / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}
