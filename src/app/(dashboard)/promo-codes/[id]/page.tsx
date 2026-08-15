import { notFound, redirect } from 'next/navigation';
import { authedFetch, ApiError, SingleResponse } from '@/lib/api-client';
import { AdminPromoCode } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DetailRow } from '@/components/detail-row';
import { PromoCodeActiveToggle } from '@/components/promo-code-active-toggle';
import { ConfirmActionButton } from '@/components/confirm-action-button';
import { formatDate } from '@/lib/format';
import { togglePromoCodeActive, deletePromoCode } from '../actions';
import { PromoCodeEditForm } from './_components/promo-code-edit-form';

function creatorName(creator: AdminPromoCode['createdBy']) {
  if (!creator || typeof creator === 'string') return creator || '—';
  return [creator.firstName, creator.lastName].filter(Boolean).join(' ') || '—';
}

export default async function PromoCodeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let promo: AdminPromoCode;
  try {
    const result = await authedFetch<SingleResponse<AdminPromoCode>>(
      `/promo-codes/${id}`
    );
    promo = result.data;
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) {
      notFound();
    }
    return (
      <ApiErrorCard
        message={error instanceof ApiError ? error.message : 'Something went wrong.'}
      />
    );
  }

  async function handleDelete() {
    'use server';
    await deletePromoCode(id);
    redirect('/promo-codes');
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="w-fit rounded bg-chip px-2.5 py-1 font-mono text-lg font-semibold">
        {promo.code}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <DetailRow
            label="Usage"
            value={`${promo.usedCount}${promo.usageLimit ? ` / ${promo.usageLimit}` : ''}`}
          />
          <DetailRow label="Created by" value={creatorName(promo.createdBy)} />
          <DetailRow label="Created" value={formatDate(promo.createdAt)} />
          <DetailRow
            label="Status"
            value={
              <PromoCodeActiveToggle
                isActive={promo.isActive}
                action={togglePromoCodeActive.bind(null, promo._id)}
              />
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Edit promo code</CardTitle>
        </CardHeader>
        <CardContent>
          <PromoCodeEditForm promo={promo} />
        </CardContent>
      </Card>

      <div>
        <ConfirmActionButton
          label="Delete promo code"
          title="Delete this promo code?"
          description="This soft-deletes the promo code. It stays recoverable in the database."
          action={handleDelete}
        />
      </div>
    </div>
  );
}
