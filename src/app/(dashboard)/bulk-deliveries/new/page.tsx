import { PageHeader, PageStack } from '@/components/page';
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
    <PageStack>
      <PageHeader
        back={{ href: '/bulk-deliveries', label: 'All bulk deliveries' }}
        title="New bulk delivery"
        subtitle="Book a vendor’s drops into their account. Each one tracks in their app, and you choose how they reach riders."
      />
      <BulkDeliveryForm riders={riders} />
    </PageStack>
  );
}
