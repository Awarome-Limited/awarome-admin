import 'server-only';
import { cache } from 'react';
import { authedFetch, PaginatedResponse, SingleResponse } from '@/lib/api-client';
import { hasPermission, PermissionAction, PermissionModule, StaffProfile } from '@/lib/permissions';
import type { QueueCounts } from '@/lib/nav-items';

/** A queue that fails to load reads as unknown (undefined), never as an empty 0. */
async function tryCount(load: () => Promise<number>): Promise<number | undefined> {
  try {
    return await load();
  } catch {
    return undefined;
  }
}

/**
 * Work waiting on a human: the sidebar's yellow badges and the dashboard's
 * "Needs you now" tiles. Cached per request so both read the same numbers.
 */
export const getQueueCounts = cache(async (profile: StaffProfile): Promise<QueueCounts> => {
  const can = (module: PermissionModule) => hasPermission(profile, module, PermissionAction.VIEW);

  const [riderApprovals, supportTickets, cancellations, unassigned] = await Promise.all([
    can(PermissionModule.RIDERS)
      ? tryCount(async () => {
          const r = await authedFetch<PaginatedResponse<unknown>>(
            '/riders/admin?verificationStatus=pending&limit=1'
          );
          return r.totalCount ?? 0;
        })
      : undefined,
    can(PermissionModule.ORDERS)
      ? tryCount(async () => {
          const r = await authedFetch<SingleResponse<{ open: Record<string, number> }>>(
            '/admins/support-tickets?status=open'
          );
          return Object.values(r.data.open ?? {}).reduce((sum, n) => sum + n, 0);
        })
      : undefined,
    can(PermissionModule.ORDERS)
      ? tryCount(async () => {
          const r = await authedFetch<
            SingleResponse<{ counts: { orders: number; deliveries: number } }>
          >('/admins/cancellation-requests?status=pending');
          return (r.data.counts?.orders ?? 0) + (r.data.counts?.deliveries ?? 0);
        })
      : undefined,
    can(PermissionModule.ORDERS)
      ? tryCount(async () => {
          const r = await authedFetch<
            SingleResponse<{ orders: unknown[]; deliveries: unknown[]; batches: unknown[] }>
          >('/admins/unassigned-jobs');
          return r.data.orders.length + r.data.deliveries.length + r.data.batches.length;
        })
      : undefined,
  ]);

  return { riderApprovals, supportTickets, cancellations, unassigned };
});
