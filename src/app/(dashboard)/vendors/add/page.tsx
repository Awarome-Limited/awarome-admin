'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Field,
  FieldGrid,
  InlineNotice,
  PageHeader,
  PageStack,
  Panel,
  SettingsLayout,
  SummaryRows,
} from '@/components/page';
import { VENDOR_TYPES } from '@/lib/types';
import { toDisplayTime } from '@/lib/format';
import { createVendor } from '../actions';
import { startNavigationProgress } from '@/components/navigation-progress';

const TYPE_LABELS: Record<(typeof VENDOR_TYPES)[number], string> = {
  groceries: 'Groceries',
  supermarket: 'Supermarket',
  appliances: 'Appliances',
  health_and_beauty: 'Health & beauty',
  fashion: 'Fashion',
  electronics: 'Electronics',
};

export default function AddVendorPage() {
  const router = useRouter();
  const [types, setTypes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleType(type: string) {
    setTypes((current) =>
      current.includes(type) ? current.filter((t) => t !== type) : [...current, type]
    );
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    const name = formData.get('name')?.toString().trim();
    const businessName = formData.get('businessName')?.toString().trim();
    const email = formData.get('email')?.toString().trim();
    const phone = formData.get('phone')?.toString().trim();
    const address = formData.get('address')?.toString().trim();
    // Stored in the house format ('4pm'), matching every existing vendor and
    // what the customer apps render.
    const opensAt = toDisplayTime(formData.get('opensAt')?.toString().trim());
    const closesAt = toDisplayTime(formData.get('closesAt')?.toString().trim());
    const lat = Number(formData.get('lat'));
    const long = Number(formData.get('long'));

    if (!name || !email || !phone || !address || !opensAt || !closesAt) {
      setError('Please fill in all required fields.');
      return;
    }
    if (types.length === 0) {
      setError('Select at least one category.');
      return;
    }
    if (!lat || !long) {
      setError('Latitude and longitude are required.');
      return;
    }

    startTransition(async () => {
      try {
        const vendorId = await createVendor({
          name,
          businessName: businessName || undefined,
          email,
          phone,
          address,
          state: formData.get('state')?.toString().trim() || undefined,
          type: types,
          opensAt,
          closesAt,
          location: { lat, long },
        });
        startNavigationProgress();
        router.push(`/vendors/${vendorId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create vendor.');
      }
    });
  }

  return (
    <PageStack>
      <PageHeader
        back={{ href: '/vendors', label: 'All vendors' }}
        title="Add vendor"
        subtitle="Onboard a new store to the Awarome marketplace."
      />

      <form action={handleSubmit}>
        <SettingsLayout
          aside={
            <Panel title="What happens next" description="The store is created and can sign in straight away.">
              <SummaryRows
                rows={[
                  { label: 'Categories', value: types.length ? types.map((t) => TYPE_LABELS[t as keyof typeof TYPE_LABELS] ?? t).join(', ') : 'None yet' },
                  { label: 'Approval', value: 'Waiting for review' },
                ]}
              />
              {error && <InlineNotice>{error}</InlineNotice>}
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <Button loading={isPending} type="submit" size="lg" disabled={isPending}>
                  {isPending ? 'Creating…' : 'Create vendor'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => {
                    startNavigationProgress();
                    router.push('/vendors');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </Panel>
          }
        >
          <Panel title="Business" description="Who runs the store and how customers and riders reach them.">
            <FieldGrid>
              <TextField label="Owner or contact name" name="name" placeholder="e.g. Tunde Adeyemi" required />
              <TextField label="Business name" name="businessName" placeholder="e.g. FreshMart Express" />
              <TextField label="Email address" name="email" type="email" placeholder="vendor@example.com" required />
              <TextField label="Phone number" name="phone" placeholder="0803 123 4567" required />
            </FieldGrid>
          </Panel>

          <Panel title="Location" description="Riders are routed to these coordinates for pickups.">
            <FieldGrid>
              <div className="col-span-full">
                <TextField label="Street address" name="address" placeholder="12 Adeola Odeku St" required />
              </div>
              <TextField label="State" name="state" placeholder="Lagos" />
              <TextField label="Latitude" name="lat" type="number" step="any" placeholder="6.5244" required />
              <TextField label="Longitude" name="long" type="number" step="any" placeholder="3.3792" required />
            </FieldGrid>
          </Panel>

          <Panel title="Categories" description="Pick every category this store sells in.">
            <div className="flex flex-wrap gap-2">
              {VENDOR_TYPES.map((type) => {
                const active = types.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleType(type)}
                    className={
                      active
                        ? 'h-9 rounded-full border-[1.5px] border-primary bg-brand-tint px-4 text-[13.5px] font-medium text-primary'
                        : 'h-9 rounded-full border border-border bg-card px-4 text-[13.5px] text-foreground-secondary hover:bg-muted'
                    }
                  >
                    {TYPE_LABELS[type]}
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel title="Opening hours" description="Lagos time. Customers can’t order outside these hours.">
            <FieldGrid>
              <TextField label="Opens at" name="opensAt" type="time" required />
              <TextField label="Closes at" name="closesAt" type="time" required />
            </FieldGrid>
          </Panel>
        </SettingsLayout>
      </form>
    </PageStack>
  );
}

function TextField({
  label,
  name,
  type = 'text',
  step,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  step?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <Field label={label} htmlFor={name}>
      <Input id={name} name={name} type={type} step={step} placeholder={placeholder} required={required} />
    </Field>
  );
}
