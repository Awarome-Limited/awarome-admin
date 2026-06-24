// Mirrors src/modules/activityLogs/types/activityLogs.types.ts in awarome-BE.

export const LOG_LEVELS = ['info', 'warning', 'error', 'debug'] as const;

export const LOG_CATEGORIES = [
  'auth',
  'user',
  'vendor',
  'partner',
  'product',
  'order',
  'payment',
  'product-search',
  'system',
  'dedicated_virtual_account',
  'staff',
  'pricing',
  'delivery',
  'rider',
] as const;
