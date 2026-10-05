import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { hasPermission, PermissionAction, PermissionModule } from '@/lib/permissions';
import { BulkDeliveryForm } from '../_components/bulk-delivery-form';

export default async function NewBulkDeliveryPage() {
  const session = await getSession();
  if (
    !session ||
    !hasPermission(session.profile, PermissionModule.DELIVERIES, PermissionAction.CREATE)
  ) {
    redirect('/bulk-deliveries');
  }

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
          Book a vendor’s drops into their account. Each one tracks in their app and joins the batch pool.
        </p>
      </div>
      <BulkDeliveryForm />
    </div>
  );
}
