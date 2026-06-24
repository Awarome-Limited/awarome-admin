import { StaffRole } from '@/lib/permissions';

export const ROLE_LABELS: Record<StaffRole, string> = {
  [StaffRole.SUPER_ADMIN]: 'Super admin',
  [StaffRole.OPS]: 'Operations',
  [StaffRole.SUPPORT]: 'Support',
  [StaffRole.FINANCE]: 'Finance',
};

export const ROLE_DESCRIPTIONS: Record<StaffRole, string> = {
  [StaffRole.SUPER_ADMIN]: 'Full access to every module, including staff and permissions.',
  [StaffRole.OPS]: 'Manage vendors, riders, orders, and deliveries.',
  [StaffRole.SUPPORT]: 'View users, orders, deliveries, and promo codes.',
  [StaffRole.FINANCE]: 'Manage payments, pricing, and view analytics.',
};
