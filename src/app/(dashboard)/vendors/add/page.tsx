'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { VENDOR_TYPES } from '@/lib/types';
import { createVendor } from '../actions';

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
    const opensAt = formData.get('opensAt')?.toString().trim();
    const closesAt = formData.get('closesAt')?.toString().trim();
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
        router.push(`/vendors/${vendorId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create vendor.');
      }
    });
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Link
        href="/vendors"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to vendors
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">Add vendor</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Onboard a new store to the Awarome marketplace
        </p>
      </div>

      <form action={handleSubmit} className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Business information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Owner / contact name" name="name" placeholder="e.g. Tunde Adeyemi" required />
            <Field label="Business name" name="businessName" placeholder="e.g. FreshMart Express" />
            <Field label="Email address" name="email" type="email" placeholder="vendor@example.com" required />
            <Field label="Phone number" name="phone" placeholder="080…" required />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="address">Street address</Label>
              <Input id="address" name="address" placeholder="12 Adeola Odeku St" required />
            </div>
            <Field label="State" name="state" placeholder="Lagos State" />
            <Field label="Latitude" name="lat" type="number" step="any" placeholder="6.5244" required />
            <Field label="Longitude" name="long" type="number" step="any" placeholder="3.3792" required />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {VENDOR_TYPES.map((type) => {
                const active = types.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleType(type)}
                    className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
                      active
                        ? 'border-primary bg-brand-tint2 text-primary'
                        : 'border-border-strong text-muted-foreground'
                    }`}
                  >
                    {TYPE_LABELS[type]}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operating hours</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Opens at" name="opensAt" placeholder="08:00" required />
            <Field label="Closes at" name="closesAt" placeholder="20:00" required />
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={isPending} onClick={() => router.push('/vendors')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            Create vendor
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
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
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} step={step} placeholder={placeholder} required={required} />
    </div>
  );
}
