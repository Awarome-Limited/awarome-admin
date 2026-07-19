import { PermissionAction, PermissionModule } from '@/lib/permissions';

export interface NavItem {
  label: string;
  href: string;
  module: PermissionModule;
  icon: string;
  category: string;
}

export const DASHBOARD_ICON = 'M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z';

export const NAV_ITEMS: NavItem[] = [
  // Core
  {
    label: 'Users',
    href: '/users',
    module: PermissionModule.USERS,
    icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
    category: 'Core Management',
  },
  {
    label: 'Vendors',
    href: '/vendors',
    module: PermissionModule.VENDORS,
    icon: 'M3 9l1.5-5h15L21 9 M4 9v10h16V9 M9 19v-6h6v6',
    category: 'Core Management',
  },
  {
    label: 'Products',
    href: '/products',
    module: PermissionModule.PRODUCTS,
    icon: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.3 7L12 12l8.7-5 M12 22V12',
    category: 'Core Management',
  },
  {
    label: 'Staff',
    href: '/staff',
    module: PermissionModule.STAFF,
    icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4',
    category: 'Core Management',
  },

  // Orders & Deliveries
  {
    label: 'Orders',
    href: '/orders',
    module: PermissionModule.ORDERS,
    icon: 'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0',
    category: 'Orders & Deliveries',
  },
  {
    label: 'Carts',
    href: '/carts',
    module: PermissionModule.CARTS,
    icon: 'M9 22a1 1 0 1 0 0-2 1 1 0 0 0 0 2 M20 22a1 1 0 1 0 0-2 1 1 0 0 0 0 2 M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6',
    category: 'Orders & Deliveries',
  },
  {
    label: 'Deliveries',
    href: '/deliveries',
    module: PermissionModule.DELIVERIES,
    icon: 'M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z M12 13a3 3 0 1 1 0-6 3 3 0 0 1 0 6z',
    category: 'Orders & Deliveries',
  },
  {
    label: 'Unassigned',
    href: '/unassigned',
    module: PermissionModule.ORDERS,
    icon: 'M22 12h-6l-2 3h-4l-2-3H2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6z M5.45 5.11L2 12h20l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
    category: 'Orders & Deliveries',
  },

  // Fleet & Logistics
  {
    label: 'Riders',
    href: '/riders',
    module: PermissionModule.RIDERS,
    icon: 'M5.5 17.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5 M18.5 17.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5 M5.5 12.5L9 6h4l2.5 4 M12 6l2 9',
    category: 'Fleet & Logistics',
  },
  {
    label: 'Rider Approvals',
    href: '/riders/approvals',
    module: PermissionModule.RIDERS,
    icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M16 11l2 2 4-4',
    category: 'Fleet & Logistics',
  },
  {
    label: 'Dispatch',
    href: '/dispatch',
    module: PermissionModule.PRICING,
    icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
    category: 'Fleet & Logistics',
  },
  {
    label: 'Delivery Zones',
    href: '/zones',
    module: PermissionModule.PRICING,
    icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
    category: 'Fleet & Logistics',
  },

  // Finance & Sales
  {
    label: 'Payments',
    href: '/payments',
    module: PermissionModule.PAYMENTS,
    icon: 'M21 4H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z M1 10h22',
    category: 'Finance & Sales',
  },
  {
    label: 'Wallets',
    href: '/payments/wallets',
    module: PermissionModule.PAYMENTS,
    icon: 'M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4 M4 6v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4 M18 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
    category: 'Finance & Sales',
  },
  {
    label: 'Refunds',
    href: '/refunds',
    module: PermissionModule.PAYMENTS,
    icon: 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8 M3 3v5h5',
    category: 'Finance & Sales',
  },
  {
    label: 'Pricing',
    href: '/pricing',
    module: PermissionModule.PRICING,
    icon: 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z M7 7h.01',
    category: 'Finance & Sales',
  },
  {
    label: 'Promo Codes',
    href: '/promo-codes',
    module: PermissionModule.PROMO_CODES,
    icon: 'M19 5L5 19 M6.5 8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3 M17.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3',
    category: 'Finance & Sales',
  },

  // Marketing & System
  {
    label: 'Push Notifications',
    href: '/push-notifications',
    module: PermissionModule.NOTIFICATIONS,
    icon: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0',
    category: 'Marketing & System',
  },
  {
    label: 'Activity Logs',
    href: '/activity-logs',
    module: PermissionModule.ACTIVITY_LOGS,
    icon: 'M22 12h-4l-3 9L9 3l-3 9H2',
    category: 'Marketing & System',
  },
];

export const NAV_REQUIRED_ACTION = PermissionAction.VIEW;
