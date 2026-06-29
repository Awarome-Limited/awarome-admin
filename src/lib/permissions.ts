// Mirrors src/modules/admins/types/staff.types.ts in awarome-BE. Keep in sync
// manually until the two repos share a generated types package.

export enum StaffRole {
  SUPER_ADMIN = 'super_admin',
  OPS = 'ops',
  SUPPORT = 'support',
  FINANCE = 'finance',
}

export enum PermissionModule {
  USERS = 'users',
  VENDORS = 'vendors',
  RIDERS = 'riders',
  ORDERS = 'orders',
  DELIVERIES = 'deliveries',
  PAYMENTS = 'payments',
  PRICING = 'pricing',
  PROMO_CODES = 'promo_codes',
  ANALYTICS = 'analytics',
  ACTIVITY_LOGS = 'activity_logs',
  STAFF = 'staff',
  PRODUCTS = 'products',
  PARTNERS = 'partners',
  ADS = 'ads',
  NOTIFICATIONS = 'notifications',
  CARTS = 'carts',
}

export enum PermissionAction {
  VIEW = 'view',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

const ALL_PERMISSIONS_WILDCARD = '*';

export interface StaffProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: StaffRole;
  permissions: string[];
}

export function hasPermission(
  profile: Pick<StaffProfile, 'role' | 'permissions'>,
  module: PermissionModule,
  action: PermissionAction
): boolean {
  if (profile.role === StaffRole.SUPER_ADMIN) {
    return true;
  }

  const grant = `${module}:${action}`;
  return (
    profile.permissions.includes(ALL_PERMISSIONS_WILDCARD) ||
    profile.permissions.includes(grant)
  );
}
