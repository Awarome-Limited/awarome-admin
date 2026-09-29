import type { RiderPayoutBankAccount, RiderPayoutStatus, RiderPayoutTrigger } from '@/lib/types';

const STATUS_LABELS: Record<RiderPayoutStatus, string> = {
  processing: 'Processing',
  'awaiting-otp': 'Awaiting OTP',
  success: 'Paid',
  failed: 'Failed',
  reversed: 'Reversed',
};

const STATUS_VARIANTS: Record<RiderPayoutStatus, 'positive' | 'warning' | 'info' | 'destructive'> = {
  processing: 'info',
  'awaiting-otp': 'warning',
  success: 'positive',
  failed: 'destructive',
  reversed: 'destructive',
};

const TRIGGER_LABELS: Record<RiderPayoutTrigger, string> = {
  scheduled: 'Daily run',
  'manual-run': 'Manual run',
  'manual-rider': 'Paid by staff',
  'manual-vendor': 'Paid by staff',
};

export const payoutStatusLabel = (status: string) =>
  STATUS_LABELS[status as RiderPayoutStatus] ?? status;

export const payoutStatusVariant = (status: string) =>
  STATUS_VARIANTS[status as RiderPayoutStatus] ?? 'secondary';

export const payoutTriggerLabel = (trigger: string) =>
  TRIGGER_LABELS[trigger as RiderPayoutTrigger] ?? trigger;

// Rider payouts are stored in naira, unlike wallet balances (kobo).
export const naira = (value?: number | null) =>
  `₦${(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export const personName = (
  person?: { firstName?: string; lastName?: string; email?: string } | null,
  fallback = 'Unknown'
) => [person?.firstName, person?.lastName].filter(Boolean).join(' ') || person?.email || fallback;

export const maskedAccount = (bank?: RiderPayoutBankAccount | null) =>
  bank?.accountNumber
    ? `${bank.bankName ?? 'Bank'} •••• ${bank.accountNumber.slice(-4)}`
    : '—';

export const formatLagosHour = (hour: number) =>
  `${String(hour).padStart(2, '0')}:00`;

export const vendorName = (vendor?: { businessName?: string; name?: string } | null, fallback = 'Unknown vendor') =>
  vendor?.businessName || vendor?.name || fallback;

export const percent = (value?: number | null) =>
  `${(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
