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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format';
import {
  updatePromoCode,
  togglePromoCodeActive,
  deletePromoCode,
} from '../actions';

const selectClass =
  'h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

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

  async function handleEdit(formData: FormData) {
    'use server';
    const maxDiscountAmount = formData.get('maxDiscountAmount')?.toString();
    const expiryDate = formData.get('expiryDate')?.toString();
    const usageLimit = formData.get('usageLimit')?.toString();

    await updatePromoCode(id, {
      code: formData.get('code')?.toString(),
      discountType: formData.get('discountType')?.toString() as 'fixed' | 'percentage',
      discountValue: Number(formData.get('discountValue')),
      applicability: formData.get('applicability')?.toString() as
        | 'product'
        | 'delivery'
        | 'both',
      maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : undefined,
      expiryDate: expiryDate || undefined,
      usageLimit: usageLimit ? Number(usageLimit) : undefined,
      description: formData.get('description')?.toString() || undefined,
    });
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
          <form action={handleEdit} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Code" name="code" defaultValue={promo.code} required />
              <div className="flex flex-col gap-2">
                <Label htmlFor="discountType">Discount type</Label>
                <select
                  id="discountType"
                  name="discountType"
                  defaultValue={promo.discountType}
                  className={selectClass}
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed amount</option>
                </select>
              </div>
              <Field
                label="Discount value"
                name="discountValue"
                type="number"
                step="any"
                min="0"
                defaultValue={promo.discountValue}
                required
              />
              <Field
                label="Max discount amount (₦, optional)"
                name="maxDiscountAmount"
                type="number"
                step="any"
                min="0"
                defaultValue={promo.maxDiscountAmount}
              />
              <div className="flex flex-col gap-2">
                <Label htmlFor="applicability">Applies to</Label>
                <select
                  id="applicability"
                  name="applicability"
                  defaultValue={promo.applicability}
                  className={selectClass}
                >
                  <option value="both">Product + delivery</option>
                  <option value="product">Product only</option>
                  <option value="delivery">Delivery only</option>
                </select>
              </div>
              <Field
                label="Usage limit (optional)"
                name="usageLimit"
                type="number"
                min="0"
                defaultValue={promo.usageLimit}
              />
              <Field
                label="Expiry date (optional)"
                name="expiryDate"
                type="date"
                defaultValue={promo.expiryDate ? promo.expiryDate.slice(0, 10) : undefined}
              />
              <Field
                label="Description (optional)"
                name="description"
                defaultValue={promo.description}
              />
            </div>
            <Button type="submit" className="self-start">
              Save changes
            </Button>
          </form>
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

function Field({
  label,
  name,
  type = 'text',
  step,
  min,
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  step?: string;
  min?: string;
  required?: boolean;
  defaultValue?: string | number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        step={step}
        min={min}
        required={required}
        defaultValue={defaultValue}
      />
    </div>
  );
}
