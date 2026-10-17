import { notFound, redirect } from 'next/navigation';
import { authedFetch, ApiError, SingleResponse } from '@/lib/api-client';
import { AdminPromoCode } from '@/lib/types';
import { ApiErrorCard } from '@/components/api-error-card';
import { PromoCodeActiveControl, PromoStatusPill } from '@/components/promo-code-active-toggle';
import { DetailHeader, PageStack, Panel, StatCards } from '@/components/page';
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
    <PageStack>
      <DetailHeader
        back={{ href: '/promo-codes', label: 'All promo codes' }}
        title={<span className="tracking-[0.01em] uppercase">{promo.code}</span>}
        status={<PromoStatusPill isActive={promo.isActive} />}
        meta={[`Created ${formatDate(promo.createdAt)}`, `by ${creatorName(promo.createdBy)}`]}
        actions={
          <PromoCodeActiveControl isActive={promo.isActive} action={togglePromoCodeActive.bind(null, promo._id)} />
        }
      />

      <StatCards
        stats={[
          {
            label: 'Redemptions',
            value: (promo.usedCount ?? 0).toLocaleString(),
            progress: promo.usageLimit ? (promo.usedCount ?? 0) / promo.usageLimit : undefined,
            meta: promo.usageLimit ? `of ${promo.usageLimit.toLocaleString()} allowed` : 'No limit',
          },
          {
            label: 'Expires',
            value: promo.expiryDate ? formatDate(promo.expiryDate).split(',')[0] : 'Never',
          },
        ]}
      />

      <section className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        <Panel title="Edit promo code" description="Change a field and a save bar appears at the bottom.">
          <PromoCodeEditForm promo={promo} />
        </Panel>
        <Panel title="Delete promo code" description="Soft-deletes the code. It stays recoverable in the database.">
          <div>
            <ConfirmActionButton
              label="Delete promo code"
              title="Delete this promo code?"
              description="This soft-deletes the promo code. It stays recoverable in the database."
              action={handleDelete}
            />
          </div>
        </Panel>
      </section>
    </PageStack>
  );
}
