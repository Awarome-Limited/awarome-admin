'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatLagosDateTime } from '@/lib/format';
import {
  draftToPayload,
  hasErrors,
  utcToLagosParts,
  validateDraft,
  type AudienceListOption,
  type PushDraft,
} from '@/lib/scheduled-push';
import type { AdminScheduledPush } from '@/lib/types';
import { useEditForm } from '@/lib/use-edit-form';
import { PushPreviewCard } from '../../_components/push-preview-card';
import { cancelScheduledPush, updateScheduledPush } from '../actions';
import { ScheduleRowEditor } from './schedule-row-editor';

type EditValues = {
  key: string;
  title: string;
  message: string;
  audience: PushDraft['audience'];
  audienceListId: string;
  date: string;
  time: string;
};

export function ScheduledPushActions({
  push,
  lists,
}: {
  push: AdminScheduledPush;
  lists: AudienceListOption[];
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
        Edit
      </Button>
      <CancelPushButton push={push} />
      {editing && (
        <EditPushDialog push={push} lists={lists} onClose={() => setEditing(false)} />
      )}
    </div>
  );
}

function CancelPushButton({ push }: { push: AdminScheduledPush }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function cancel() {
    startTransition(async () => {
      const result = await cancelScheduledPush(push._id);
      if (result.ok) {
        setOpen(false);
        toast.success('Push cancelled.');
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !isPending && setOpen(next)}>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        Cancel
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this push?</AlertDialogTitle>
          <AlertDialogDescription>
            “{push.title}” will not go out on {formatLagosDateTime(push.sendAt)} WAT. A
            cancelled push can’t be restored — schedule it again if you change your mind.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Keep it</AlertDialogCancel>
          <Button variant="destructive" onClick={cancel} disabled={isPending}>
            {isPending ? 'Cancelling…' : 'Cancel push'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function EditPushDialog({
  push,
  lists,
  onClose,
}: {
  push: AdminScheduledPush;
  lists: AudienceListOption[];
  onClose: () => void;
}) {
  const [saveAttempted, setSaveAttempted] = useState(false);
  const record: EditValues = {
    key: push._id,
    title: push.title,
    message: push.message,
    audience: push.audience,
    audienceListId: push.audienceList ?? '',
    ...utcToLagosParts(push.sendAt),
  };

  const { values, set, submit, isPending } = useEditForm<EditValues>(
    record,
    async (next) => {
      const result = await updateScheduledPush(push._id, draftToPayload(next));
      if (result.ok) onClose();
      return result;
    },
    {
      successMessage: 'Scheduled push updated.',
      errorMessage: 'Could not update the push.',
    }
  );

  const errors = validateDraft(values, lists);

  function save() {
    setSaveAttempted(true);
    if (!hasErrors(errors)) submit();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !isPending && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Edit scheduled push</DialogTitle>
          <DialogDescription>
            Changes apply until the push starts sending.
          </DialogDescription>
        </DialogHeader>

        <ScheduleRowEditor
          draft={values}
          lists={lists}
          errors={errors}
          showEmptyErrors={saveAttempted}
          onChange={set}
          disabled={isPending}
        />

        <div
          className="rounded-[16px] p-3.5"
          style={{ background: 'linear-gradient(150deg, var(--brand-tint), var(--muted, #f4f5f7))' }}
        >
          <PushPreviewCard title={values.title} body={values.message} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Close
          </Button>
          <Button onClick={save} disabled={isPending}>
            {isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
