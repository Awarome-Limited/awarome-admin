'use client';

import { useTransition, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { changePassword } from '../actions';
import { Button } from '@/components/ui/button';

const inputClass =
  'field pr-11';

function PasswordInput({
  name,
  autoComplete,
  required,
  minLength,
  onChange,
}: {
  name: string;
  autoComplete: string;
  required?: boolean;
  minLength?: number;
  onChange?: () => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        name={name}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        onChange={onChange}
        className={inputClass}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        aria-label={visible ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export function ChangePasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [confirmError, setConfirmError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const currentPassword = data.get('currentPassword') as string;
    const newPassword = data.get('newPassword') as string;
    const confirmPassword = data.get('confirmPassword') as string;

    if (newPassword !== confirmPassword) {
      setConfirmError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setConfirmError('New password must be at least 8 characters.');
      return;
    }
    setConfirmError('');

    startTransition(async () => {
      try {
        await changePassword(currentPassword, newPassword);
        toast.success('Password changed successfully.');
        formRef.current?.reset();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to change password.');
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-5">
      <label className="flex flex-col gap-[7px]">
        <span className="text-[13.5px] font-medium text-foreground">
          Current password <span className="text-destructive">*</span>
        </span>
        <PasswordInput name="currentPassword" autoComplete="current-password" required />
      </label>

      <label className="flex flex-col gap-[7px]">
        <span className="text-[13.5px] font-medium text-foreground">
          New password <span className="text-destructive">*</span>
        </span>
        <PasswordInput
          name="newPassword"
          autoComplete="new-password"
          required
          minLength={8}
          onChange={() => setConfirmError('')}
        />
        <span className="text-[11.5px] text-muted-foreground">Minimum 8 characters.</span>
      </label>

      <label className="flex flex-col gap-[7px]">
        <span className="text-[13.5px] font-medium text-foreground">
          Confirm new password <span className="text-destructive">*</span>
        </span>
        <PasswordInput
          name="confirmPassword"
          autoComplete="new-password"
          required
          onChange={() => setConfirmError('')}
        />
        {confirmError && (
          <span className="text-[12px] text-destructive">{confirmError}</span>
        )}
      </label>

      <div className="flex items-center justify-end border-t border-border pt-4">
        <Button type="submit" loading={isPending}>
          {isPending ? 'Saving…' : 'Change password'}
        </Button>
      </div>
    </form>
  );
}
