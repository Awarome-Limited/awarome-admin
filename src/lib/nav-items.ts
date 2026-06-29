import { PermissionAction, PermissionModule } from '@/lib/permissions';

export interface NavItem {
  label: string;
  href: string;
  module: PermissionModule;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Users', href: '/users', module: PermissionModule.USERS },
  { label: 'Vendors', href: '/vendors', module: PermissionModule.VENDORS },
  { label: 'Products', href: '/products', module: PermissionModule.PRODUCTS },
  { label: 'Orders', href: '/orders', module: PermissionModule.ORDERS },
  { label: 'Carts', href: '/carts', module: PermissionModule.CARTS },
  { label: 'Deliveries', href: '/deliveries', module: PermissionModule.DELIVERIES },
  { label: 'Riders', href: '/riders', module: PermissionModule.RIDERS },
  { label: 'Payments', href: '/payments', module: PermissionModule.PAYMENTS },
  { label: 'Wallets', href: '/payments/wallets', module: PermissionModule.PAYMENTS },
  { label: 'Push Notifications', href: '/push-notifications', module: PermissionModule.NOTIFICATIONS },
  { label: 'Pricing', href: '/pricing', module: PermissionModule.PRICING },
  { label: 'Promo Codes', href: '/promo-codes', module: PermissionModule.PROMO_CODES },
  { label: 'Staff', href: '/staff', module: PermissionModule.STAFF },
  { label: 'Activity Logs', href: '/activity-logs', module: PermissionModule.ACTIVITY_LOGS },
];

export const NAV_REQUIRED_ACTION = PermissionAction.VIEW;

export const DASHBOARD_ICON = 'M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z';

export const NAV_ICONS: Record<PermissionModule, string> = {
  [PermissionModule.USERS]:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  [PermissionModule.VENDORS]: 'M3 9l1.5-5h15L21 9 M4 9v10h16V9 M9 19v-6h6v6',
  [PermissionModule.RIDERS]:
    'M5.5 17.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5 M18.5 17.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5 M5.5 12.5L9 6h4l2.5 4 M12 6l2 9',
  [PermissionModule.ORDERS]: 'M21 8l-9-5-9 5 9 5 9-5z M3 8v8l9 5 9-5V8 M12 13v8',
  [PermissionModule.DELIVERIES]:
    'M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
  [PermissionModule.PAYMENTS]:
    'M3 6a2 2 0 0 1 2-2h12v4 M3 6v12a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4 M22 9v4h-5a2 2 0 0 1 0-4z',
  [PermissionModule.PRICING]: 'M20.6 12.6l-8 8L3 11V3h8z M7.5 7.5h.01',
  [PermissionModule.PROMO_CODES]:
    'M19 5L5 19 M6.5 8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3 M17.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3',
  [PermissionModule.ANALYTICS]: 'M3 3v18h18 M7 14l3-3 3 3 5-6',
  [PermissionModule.ACTIVITY_LOGS]: 'M22 12h-4l-3 9L9 3l-3 9H2',
  [PermissionModule.STAFF]:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M16 11l2 2 4-4',
  [PermissionModule.PRODUCTS]: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.3 7L12 12l8.7-5 M12 22V12',
  [PermissionModule.PARTNERS]: 'M3 9l1.5-5h15L21 9 M4 9v10h16V9 M9 19v-6h6v6',
  [PermissionModule.ADS]: 'M3 3v18h18 M7 14l3-3 3 3 5-6',
  [PermissionModule.NOTIFICATIONS]: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0',
  [PermissionModule.CARTS]: 'M9 22a1 1 0 1 0 0-2 1 1 0 0 0 0 2 M20 22a1 1 0 1 0 0-2 1 1 0 0 0 0 2 M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6',
};
