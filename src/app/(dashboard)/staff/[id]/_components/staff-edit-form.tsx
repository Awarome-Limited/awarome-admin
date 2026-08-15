'use client';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AdminStaff } from '@/lib/types';
import {
  PermissionAction,
  PermissionModule,
  StaffRole,
} from '@/lib/permissions';
import { useEditForm } from '@/lib/use-edit-form';
import { updateStaff } from '../../actions';

const selectClass =
  'h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

interface FormState {
  firstName: string;
  lastName: string;
  role: string;
  /** Sorted so the re-seed comparison isn't tripped by ordering alone. */
  permissions: string[];
  [key: string]: string | string[];
}

/**
 * A wildcard grant means "everything", so every box reads as checked even
 * though `permissions` holds a single `*`.
 */
function hasGrant(
  permissions: string[],
  mod: PermissionModule,
  action: PermissionAction
) {
  return permissions.includes('*') || permissions.includes(`${mod}:${action}`);
}

export function StaffEditForm({ staff }: { staff: AdminStaff }) {
  const { values, set, submit, isPending } = useEditForm<FormState>(
    {
      firstName: staff.firstName ?? '',
      lastName: staff.lastName ?? '',
      role: staff.role ?? '',
      permissions: [...(staff.permissions ?? [])].sort(),
    },
    (form) =>
      updateStaff(staff._id, {
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        role: (form.role || undefined) as StaffRole | undefined,
        permissions: form.permissions,
      }),
    { successMessage: 'Staff member updated.', errorMessage: 'Failed to update staff member.' }
  );

  const toggle = (grant: string, checked: boolean) => {
    const next = new Set(values.permissions);
    if (checked) {
      next.add(grant);
    } else {
      // Explicitly dropping one box has to expand the wildcard first, or the
      // remaining `*` would silently grant back everything just unchecked.
      if (next.delete('*')) {
        for (const mod of Object.values(PermissionModule)) {
          for (const action of Object.values(PermissionAction)) {
            next.add(`${mod}:${action}`);
          }
        }
      }
      next.delete(grant);
    }
    set({ permissions: [...next].sort() });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            value={values.firstName}
            onChange={(e) => set({ firstName: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input
            id="lastName"
            value={values.lastName}
            onChange={(e) => set({ lastName: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="role">Role</Label>
          <select
            id="role"
            value={values.role}
            onChange={(e) => set({ role: e.target.value })}
            className={selectClass}
          >
            {Object.values(StaffRole).map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left font-medium">Module</th>
              {Object.values(PermissionAction).map((action) => (
                <th key={action} className="p-2 text-center font-medium capitalize">
                  {action}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.values(PermissionModule).map((mod) => (
              <tr key={mod} className="border-b last:border-0">
                <td className="p-2">{mod.replace('_', ' ')}</td>
                {Object.values(PermissionAction).map((action) => (
                  <td key={action} className="p-2 text-center">
                    <input
                      type="checkbox"
                      checked={hasGrant(values.permissions, mod, action)}
                      onChange={(e) => toggle(`${mod}:${action}`, e.target.checked)}
                      className="size-4 rounded border-input"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
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
