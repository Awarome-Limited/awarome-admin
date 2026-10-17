'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { resendBusinessInvite } from '../actions';

export function ResendInviteButton({ businessId, memberId, email }: { businessId: string; memberId: string; email: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button loading={isPending}
      size="sm"
      variant="ghost"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await resendBusinessInvite(businessId, memberId);
          if (result.ok) toast.success(`Invite resent to ${email}`);
          else toast.error(result.error);
        })
      }
    >
      {isPending ? 'Sending…' : 'Resend invite'}
    </Button>
  );
}
