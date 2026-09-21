'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { revokeApiKey } from '../actions';

export function RevokeKeyButton({
  partnerId,
  keyId,
}: {
  partnerId: string;
  keyId: string;
}) {
  const [isPending, startTransition] = useTransition();

  function revoke() {
    startTransition(async () => {
      const result = await revokeApiKey(partnerId, keyId);
      if (result.ok) toast.success('Key revoked.');
      else toast.error(result.error);
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button size="sm" variant="ghost" className="text-destructive" />}
      >
        Revoke
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke this key?</AlertDialogTitle>
          <AlertDialogDescription>
            Any traffic still using it starts failing immediately, and it cannot be
            restored. If the partner is live, issue a replacement and let them cut over
            first.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={revoke} disabled={isPending}>
            {isPending ? 'Revoking…' : 'Revoke key'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
