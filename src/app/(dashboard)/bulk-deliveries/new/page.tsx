import Link from 'next/link';
import { redirect } from 'next/navigation';
import { authedFetch, type PaginatedResponse } from '@/lib/api-client';
import { getSession } from '@/lib/session';
import type { AdminRider } from '@/lib/types';
import { hasPermission, PermissionAction, PermissionModule } from '@/lib/permissions';
import { BulkDeliveryForm } from '../_components/bulk-delivery-form';

const RIDER_LIMIT = 200;

export default async function NewBulkDeliveryPage() {
  const session = await getSession();
  if (
    !session ||
    !hasPermission(session.profile, PermissionModule.DELIVERIES, PermissionAction.CREATE)
  ) {
    redirect('/bulk-deliveries');
  }

  // For handing the whole bulk to one rider. The form still works without it.
  const riders = await authedFetch<PaginatedResponse<AdminRider>>(
    `/riders/admin?suspended=false&limit=${RIDER_LIMIT}`
  )
    .then((res) => res.data)
    .catch(() => [] as AdminRider[]);

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/bulk-deliveries"
        className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-border-strong bg-card px-3 py-1.5 text-[13px] font-semibold text-foreground-secondary hover:bg-muted"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5 M12 19l-7-7 7-7"/></svg>
        Back to bulk deliveries
      </Link>
      <div>
        <h1 className="text-[23px] font-bold tracking-tight text-foreground">New bulk delivery</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Book a vendor’s drops into their account. Each one tracks in their app, and you choose how they reach riders.
        </p>
      </div>
      <BulkDeliveryForm riders={riders} />
    </div>
  );
}
