import { PermissionModule } from '@/lib/permissions';

/**
 * The sidebar is seven workspaces, not a flat list of links (DESIGN.md §2).
 * Only the active workspace expands; a collapsed one shows a yellow dot when a
 * page inside it has a queue waiting. Add new pages to an existing workspace.
 */

/** Pages whose pending work gets a yellow count badge in the sidebar. */
export type QueueKey = 'riderApprovals' | 'supportTickets' | 'cancellations' | 'unassigned';

export type QueueCounts = Partial<Record<QueueKey, number>>;

export interface NavItem {
  label: string;
  href: string;
  /** Omitted for pages every staff member can open (Dashboard, Settings). */
  module?: PermissionModule;
  queue?: QueueKey;
}

export interface NavWorkspace {
  label: string;
  icon: string;
  items: NavItem[];
}

export const NAV_WORKSPACES: NavWorkspace[] = [
  {
    label: 'Overview',
    icon: 'M3 3h7v9H3z M14 3h7v5h-7z M14 12h7v9h-7z M3 16h7v5H3z',
    items: [{ label: 'Dashboard', href: '/' }],
  },
  {
    label: 'People',
    icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
    items: [
      { label: 'Users', href: '/users', module: PermissionModule.USERS },
      { label: 'Businesses', href: '/businesses', module: PermissionModule.BUSINESSES },
      { label: 'Vendors', href: '/vendors', module: PermissionModule.VENDORS },
      { label: 'Riders', href: '/riders', module: PermissionModule.RIDERS },
      {
        label: 'Rider approvals',
        href: '/riders/approvals',
        module: PermissionModule.RIDERS,
        queue: 'riderApprovals',
      },
      { label: 'API partners', href: '/partners', module: PermissionModule.PARTNERS },
    ],
  },
  {
    label: 'Operations',
    icon: 'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0',
    items: [
      { label: 'Orders', href: '/orders', module: PermissionModule.ORDERS },
      { label: 'Deliveries', href: '/deliveries', module: PermissionModule.DELIVERIES },
      { label: 'Bulk deliveries', href: '/bulk-deliveries', module: PermissionModule.DELIVERIES },
      {
        label: 'Support tickets',
        href: '/support-tickets',
        module: PermissionModule.ORDERS,
        queue: 'supportTickets',
      },
      {
        label: 'Cancellations',
        href: '/cancellations',
        module: PermissionModule.ORDERS,
        queue: 'cancellations',
      },
    ],
  },
  {
    label: 'Dispatch',
    icon: 'M3 7h11v10H3z M14 10h4l3 3v4h-7 M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4 M17 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4',
    items: [
      {
        label: 'Unassigned',
        href: '/unassigned',
        module: PermissionModule.ORDERS,
        queue: 'unassigned',
      },
      { label: 'Forming batches', href: '/forming-batches', module: PermissionModule.DELIVERIES },
      { label: 'Batches', href: '/batches', module: PermissionModule.DELIVERIES },
    ],
  },
  {
    label: 'Finance',
    icon: 'M21 4H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z M1 10h22',
    items: [
      { label: 'Payments', href: '/payments', module: PermissionModule.PAYMENTS },
      { label: 'Wallets', href: '/payments/wallets', module: PermissionModule.PAYMENTS },
      { label: 'Refunds', href: '/refunds', module: PermissionModule.PAYMENTS },
      { label: 'Rider payouts', href: '/payouts', module: PermissionModule.PAYMENTS },
      { label: 'Vendor payouts', href: '/vendor-payouts', module: PermissionModule.PAYMENTS },
      { label: 'Business payouts', href: '/business-payouts', module: PermissionModule.PAYMENTS },
      { label: 'Bulk receivables', href: '/bulk-receivables', module: PermissionModule.PAYMENTS },
    ],
  },
  {
    label: 'Catalog & marketing',
    icon: 'M3 11l18-5v12L3 14v-3z M11.6 16.8a3 3 0 1 1-5.8-1.6',
    items: [
      { label: 'Products', href: '/products', module: PermissionModule.PRODUCTS },
      { label: 'Promo codes', href: '/promo-codes', module: PermissionModule.PROMO_CODES },
      { label: 'Campaigns', href: '/campaigns', module: PermissionModule.CAMPAIGNS },
      {
        label: 'Push notifications',
        href: '/push-notifications',
        module: PermissionModule.NOTIFICATIONS,
      },
      { label: 'Customer emails', href: '/customer-emails', module: PermissionModule.NOTIFICATIONS },
      { label: 'Banners', href: '/banners', module: PermissionModule.ADS },
      { label: 'Carts', href: '/carts', module: PermissionModule.CARTS },
    ],
  },
  {
    label: 'Configuration',
    icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
    items: [
      { label: 'Pricing', href: '/pricing', module: PermissionModule.PRICING },
      { label: 'Dispatch rules', href: '/dispatch', module: PermissionModule.PRICING },
      { label: 'Delivery options', href: '/delivery-options', module: PermissionModule.PRICING },
      { label: 'Delivery zones', href: '/zones', module: PermissionModule.PRICING },
      { label: 'Service area', href: '/service-area', module: PermissionModule.PRICING },
      { label: 'Operating hours', href: '/operating-hours', module: PermissionModule.PRICING },
      { label: 'Staff', href: '/staff', module: PermissionModule.STAFF },
      { label: 'Activity logs', href: '/activity-logs', module: PermissionModule.ACTIVITY_LOGS },
      { label: 'Settings', href: '/settings' },
    ],
  },
];

/** The nav item a pathname belongs to: the longest href that prefixes it. */
export function matchNavItem<T extends NavItem>(items: T[], pathname: string): T | undefined {
  return items
    .filter((item) =>
      item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(item.href + '/')
    )
    .sort((a, b) => b.href.length - a.href.length)[0];
}
