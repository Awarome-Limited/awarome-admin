'use client';

import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AdminVendor } from '@/lib/types';
import { toDisplayTime, toTimeInputValue } from '@/lib/format';
import { useEditForm } from '@/lib/use-edit-form';
import { updateVendor, VendorEditPayload } from '../../actions';

interface FormState {
  name: string;
  businessName: string;
  email: string;
  phone: string;
  address: string;
  status: string;
  opensAt: string;
  closesAt: string;
  [key: string]: string;
}

export function VendorEditForm({ vendor }: { vendor: AdminVendor }) {
  const {
    values: form,
    set,
    submit,
    isPending,
  } = useEditForm<FormState>(
    {
      name: vendor.name ?? '',
      businessName: vendor.businessName ?? '',
      email: vendor.email ?? '',
      phone: vendor.phone ?? '',
      address: vendor.address ?? '',
      status: vendor.status ?? 'pending',
      opensAt: toTimeInputValue(vendor.opensAt),
      closesAt: toTimeInputValue(vendor.closesAt),
    },
    (values) => {
      // Blank optional fields are omitted, never sent as "". The API validates
      // with Joi, which rejects empty strings outright — posting one fails the
      // whole update with a 400.
      const trimmed = (value: string) => value.trim() || undefined;
      const payload: VendorEditPayload = {
        name: trimmed(values.name),
        businessName: trimmed(values.businessName),
        email: trimmed(values.email),
        phone: trimmed(values.phone),
        address: trimmed(values.address),
        status: trimmed(values.status),
        // Written back in the stored house format ('4pm'), not the picker's
        // 24-hour value, so the customer apps keep rendering hours as before.
        opensAt: toDisplayTime(values.opensAt) || undefined,
        closesAt: toDisplayTime(values.closesAt) || undefined,
      };
      return updateVendor(vendor._id, payload);
    },
    { successMessage: 'Vendor updated.', errorMessage: 'Failed to update vendor.' }
  );

  function handleSave() {
    const phone = form.phone.trim();
    if (phone && (phone.length < 11 || phone.length > 14)) {
      toast.error('Phone must be between 11 and 14 characters.');
      return;
    }
    submit();
  }

  return (
    <div
      id="edit-vendor"
      className="rounded-[14px] border border-border bg-card p-[20px_22px] shadow-[var(--shadow-card)]"
    >
      <div className="mb-4 text-[15px] font-semibold text-foreground">
        Edit vendor
      </div>
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Name"
            value={form.name}
            onChange={(name) => set({ name })}
          />
          <Field
            label="Business name"
            value={form.businessName}
            onChange={(businessName) => set({ businessName })}
          />
          <Field
            label="Email"
            value={form.email}
            onChange={(email) => set({ email })}
          />
          <Field
            label="Phone"
            value={form.phone}
            onChange={(phone) => set({ phone })}
          />
          <Field
            label="Address"
            value={form.address}
            onChange={(address) => set({ address })}
            className="sm:col-span-2"
          />

          <TimeField
            label="Opens at"
            value={form.opensAt}
            stored={vendor.opensAt}
            onChange={(opensAt) => set({ opensAt })}
          />
          <TimeField
            label="Closes at"
            value={form.closesAt}
            stored={vendor.closesAt}
            onChange={(closesAt) => set({ closesAt })}
          />

          <div className="flex flex-col gap-2">
            <Label htmlFor="status">Approval Status</Label>
            <select
              id="status"
              value={form.status}
              onChange={(e) => set({ status: e.target.value })}
              className="flex h-[36px] w-full rounded-[9px] border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus:border-primary/50"
            >
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
        <div>
          <Button type="button" onClick={handleSave} disabled={isPending}>
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
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className={`flex flex-col gap-2 ${className ?? ''}`}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function TimeField({
  label,
  value,
  stored,
  onChange,
}: {
  label: string;
  value: string;
  stored?: string;
  onChange: (value: string) => void;
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-');
  // Free text the picker can't read — show what's on record so the admin knows
  // it isn't blank, and can replace it deliberately.
  const unreadable = !value && !!stored?.trim();

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="text-[12px] text-muted-foreground">
        {unreadable
          ? `Currently stored as “${stored}” — pick a time to replace it.`
          : value
            ? `Saved as “${toDisplayTime(value)}”`
            : 'Not set'}
      </span>
    </div>
  );
}
