'use client';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AdminPromoCode } from '@/lib/types';
import { useEditForm } from '@/lib/use-edit-form';
import { updatePromoCode } from '../../actions';

const selectClass =
  'h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

interface FormState {
  code: string;
  discountType: string;
  discountValue: string;
  maxDiscountAmount: string;
  applicability: string;
  usageLimit: string;
  expiryDate: string;
  description: string;
  [key: string]: string;
}

export function PromoCodeEditForm({ promo }: { promo: AdminPromoCode }) {
  const { values, set, submit, isPending } = useEditForm<FormState>(
    {
      code: promo.code ?? '',
      discountType: promo.discountType ?? 'percentage',
      discountValue:
        promo.discountValue != null ? String(promo.discountValue) : '',
      maxDiscountAmount:
        promo.maxDiscountAmount != null ? String(promo.maxDiscountAmount) : '',
      applicability: promo.applicability ?? 'both',
      usageLimit: promo.usageLimit != null ? String(promo.usageLimit) : '',
      expiryDate: promo.expiryDate ? promo.expiryDate.slice(0, 10) : '',
      description: promo.description ?? '',
    },
    (form) =>
      updatePromoCode(promo._id, {
        code: form.code.trim() || undefined,
        discountType: form.discountType as 'fixed' | 'percentage',
        discountValue: Number(form.discountValue),
        applicability: form.applicability as 'product' | 'delivery' | 'both',
        maxDiscountAmount:
          form.maxDiscountAmount === ''
            ? undefined
            : Number(form.maxDiscountAmount),
        expiryDate: form.expiryDate || undefined,
        usageLimit: form.usageLimit === '' ? undefined : Number(form.usageLimit),
        description: form.description.trim() || undefined,
      }),
    {
      successMessage: 'Promo code updated.',
      errorMessage: 'Failed to update promo code.',
    }
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Code"
          name="code"
          value={values.code}
          onChange={(code) => set({ code })}
        />
        <div className="flex flex-col gap-2">
          <Label htmlFor="discountType">Discount type</Label>
          <select
            id="discountType"
            value={values.discountType}
            onChange={(e) => set({ discountType: e.target.value })}
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
          value={values.discountValue}
          onChange={(discountValue) => set({ discountValue })}
        />
        <Field
          label="Max discount amount (₦, optional)"
          name="maxDiscountAmount"
          type="number"
          step="any"
          min="0"
          value={values.maxDiscountAmount}
          onChange={(maxDiscountAmount) => set({ maxDiscountAmount })}
        />
        <div className="flex flex-col gap-2">
          <Label htmlFor="applicability">Applies to</Label>
          <select
            id="applicability"
            value={values.applicability}
            onChange={(e) => set({ applicability: e.target.value })}
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
          value={values.usageLimit}
          onChange={(usageLimit) => set({ usageLimit })}
        />
        <Field
          label="Expiry date (optional)"
          name="expiryDate"
          type="date"
          value={values.expiryDate}
          onChange={(expiryDate) => set({ expiryDate })}
        />
        <Field
          label="Description (optional)"
          name="description"
          value={values.description}
          onChange={(description) => set({ description })}
        />
      </div>
      <Button
        type="button"
        className="self-start"
        onClick={() => submit()}
        disabled={isPending}
      >
        {isPending ? (
          <>
            <Spinner />
            Saving…
          </>
        ) : (
          'Save changes'
        )}
      </Button>
    </div>
  );
}

function Field({
  label,
  name,
  type = 'text',
  step,
  min,
  value,
  onChange,
}: {
  label: string;
  name: string;
  type?: string;
  step?: string;
  min?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        type={type}
        step={step}
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
