'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface VendorOption {
  _id: string;
  label: string;
}

export function VendorFilter({ vendors, currentVendorId }: { vendors: VendorOption[]; currentVendorId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (vendorId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (vendorId) {
      params.set('vendor', vendorId);
    } else {
      params.delete('vendor');
    }
    params.delete('skip');
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <select
      value={currentVendorId}
      onChange={(e) => handleChange(e.target.value)}
      className="toolbar-select"
    >
      <option value="">All vendors</option>
      {vendors.map((v) => (
        <option key={v._id} value={v._id}>
          {v.label}
        </option>
      ))}
    </select>
  );
}
