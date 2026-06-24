// Mirrors src/modules/orders/types/index.ts in awarome-BE.

export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'failed',
  'cancelled',
  'initialized',
] as const;

export const ORDER_DELIVERY_STATUSES = [
  'pending',
  'accepted',
  'rejected',
  'arrived',
  'picked-up',
  'delivering',
  'delivered',
  'rejected-by-vendor',
] as const;

export const ORDER_VENDOR_STATUSES = ['pending', 'accepted', 'rejected'] as const;

// Mirrors src/modules/deliveries/types/enums.ts in awarome-BE.
export const DELIVERY_STATUSES = [
  'initialized',
  'pending',
  'confirmed',
  'failed',
  'cancelled',
] as const;
