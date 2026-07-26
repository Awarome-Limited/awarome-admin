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

/**
 * Vendor trading hours are stored as free text in the house style — '4pm',
 * '9am', '4:30pm'. These two helpers convert between that and the 'HH:MM' an
 * <input type="time"> requires, so admins get a real time picker while the
 * stored format stays what the apps already display.
 */
export function toTimeInputValue(value?: string): string {
  const raw = value?.trim();
  if (!raw) return '';

  const match = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(raw);
  if (!match) return '';

  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  const meridiem = match[3]?.toLowerCase();

  // No meridiem means it was already written 24-hour ('16:00').
  if (meridiem === 'pm' && hours < 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return '';

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** 'HH:MM' → the stored house format: '16:00' → '4pm', '16:30' → '4:30pm'. */
export function toDisplayTime(value?: string): string {
  const raw = value?.trim();
  if (!raw) return '';

  const match = /^(\d{1,2}):(\d{2})$/.exec(raw);
  if (!match) return raw;

  const hours24 = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours24 > 23 || minutes > 59) return raw;

  const meridiem = hours24 < 12 ? 'am' : 'pm';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;

  return minutes === 0
    ? `${hours12}${meridiem}`
    : `${hours12}:${String(minutes).padStart(2, '0')}${meridiem}`;
}
