'use client';

import { useTransition, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { changePassword } from '../actions';

const inputClass =
  'w-full rounded-[10px] border border-input bg-background py-[11px] pl-[14px] pr-11 text-[14px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50';

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
        <span className="text-[13px] font-medium text-foreground-secondary">
          Current password <span className="text-destructive">*</span>
        </span>
        <PasswordInput name="currentPassword" autoComplete="current-password" required />
      </label>

      <label className="flex flex-col gap-[7px]">
        <span className="text-[13px] font-medium text-foreground-secondary">
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
        <span className="text-[13px] font-medium text-foreground-secondary">
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
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-[10px] bg-primary px-5 py-[11px] text-[13.5px] font-semibold text-primary-foreground shadow-[var(--shadow-card)] transition-all hover:brightness-110 disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Change password'}
        </button>
      </div>
    </form>
  );
}
