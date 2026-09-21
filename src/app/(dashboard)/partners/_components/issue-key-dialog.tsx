'use client';

import { useState, useTransition } from 'react';
import { CheckIcon, CopyIcon, KeyRoundIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { IssuedPartnerApiKey } from '@/lib/types';
import { issueApiKey } from '../actions';

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard is blocked in some browsers/contexts — the value is on
      // screen and selectable, so this is a convenience, not the only route.
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-lg border border-border bg-muted px-3 py-2 font-mono text-[12px] break-all select-all">
          {value}
        </code>
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          {copied ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  );
}

export function IssueKeyDialog({ partnerId }: { partnerId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<IssuedPartnerApiKey | null>(null);
  const [isPending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    // Clear only after the dialog has gone, so the secret does not flash away
    // while it is still on screen.
    setTimeout(() => {
      setIssued(null);
      setError(null);
    }, 200);
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    const label = formData.get('label')?.toString().trim();

    startTransition(async () => {
      try {
        setIssued(await issueApiKey(partnerId, { label: label || undefined }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to issue the key.');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogTrigger render={<Button size="sm" />}>
        <KeyRoundIcon data-icon="inline-start" />
        Issue API key
      </DialogTrigger>
      <DialogContent>
        {issued ? (
          <>
            <DialogHeader>
              <DialogTitle>Copy the secret now</DialogTitle>
              <DialogDescription>
                We store only a hash of it, so this is the one and only time it can be
                shown. If it is lost, issue a new key and revoke this one.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <CopyRow label="Key ID" value={issued.keyId} />
              <CopyRow label="Secret" value={issued.secret} />
              <p className="text-[13px] text-muted-foreground">
                Send these to the partner over a channel they trust. They go in the{' '}
                <code className="font-mono text-[12px]">x-awrm-key-id</code> and{' '}
                <code className="font-mono text-[12px]">x-awrm-key-secret</code> headers.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" onClick={close}>
                I&apos;ve copied the secret
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Issue an API key</DialogTitle>
              <DialogDescription>
                Keys belong to the organisation, not to a person — so retiring a contact
                never breaks the partner&apos;s live traffic. Issue a second key to rotate
                without downtime.
              </DialogDescription>
            </DialogHeader>
            <form action={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="label">Label (optional)</Label>
                <Input
                  id="label"
                  name="label"
                  placeholder="e.g. Production — checkout service"
                  maxLength={120}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={close} disabled={isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Issuing…' : 'Issue key'}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
