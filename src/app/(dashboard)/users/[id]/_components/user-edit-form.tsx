'use client';

import { toast } from 'sonner';
import { FieldGrid, Panel } from '@/components/page';
import { SaveBar } from '@/components/save-bar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AdminUser } from '@/lib/types';
import { useEditForm } from '@/lib/use-edit-form';
import { updateUser } from '../../actions';

interface FormState {
  firstName: string;
  lastName: string;
  phone: string;
  source: string;
  [key: string]: string;
}

export function UserEditForm({ user }: { user: AdminUser }) {
  const { values, set, submit, isPending, dirty, reset } = useEditForm<FormState>(
    {
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      phone: user.phone ?? '',
      source: user.source ?? '',
    },
    (form) =>
      updateUser(user._id, {
        // Blank fields are omitted, never sent as "" — the API validates with
        // Joi, which rejects empty strings and fails the whole update.
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        phone: form.phone.trim() || undefined,
        source: form.source.trim() || undefined,
      }),
    { successMessage: 'User updated.', errorMessage: 'Failed to update user.' }
  );

  function handleSave() {
    const phone = values.phone.trim();
    if (phone && (phone.length < 11 || phone.length > 14)) {
      // Caught here rather than round-tripping to Joi, which rejects the whole
      // update rather than just this field.
      toast.error('Phone must be between 11 and 14 characters.');
      return;
    }
    submit();
  }

  return (
    <Panel title="Edit profile" description="Change a field and a save bar appears at the bottom.">
      <div id="edit-user" className="flex flex-col gap-4">
        <FieldGrid>
          <Field
            label="First name"
            name="firstName"
            value={values.firstName}
            onChange={(firstName) => set({ firstName })}
          />
          <Field
            label="Last name"
            name="lastName"
            value={values.lastName}
            onChange={(lastName) => set({ lastName })}
          />
          <Field
            label="Phone"
            name="phone"
            value={values.phone}
            onChange={(phone) => set({ phone })}
          />
          <Field
            label="Heard via"
            name="source"
            value={values.source}
            onChange={(source) => set({ source })}
          />
        </FieldGrid>
      </div>
      <SaveBar
        dirty={dirty}
        saving={isPending}
        label="Unsaved profile changes"
        onDiscard={reset}
        onSave={handleSave}
      />
    </Panel>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
