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
  repeatLabel,
  utcToLagosParts,
  validateDraft,
  type AudienceListOption,
  type PushDraft,
} from '@/lib/scheduled-push';
import type { AdminScheduledPush } from '@/lib/types';
import { useEditForm } from '@/lib/use-edit-form';
import { cn } from '@/lib/utils';
import { PushPreviewCard } from '../../_components/push-preview-card';
import { cancelScheduledPush, updateScheduledPush } from '../actions';
import { ScheduleRowEditor } from './schedule-row-editor';

// The dialog never edits the repeat settings themselves, so those two fields
// stay blank and are excluded from the payload it sends.
type EditValues = Omit<PushDraft, 'hints'>;

const sends = (n: number) => `${n.toLocaleString()} send${n === 1 ? '' : 's'}`;

/** Sends still to come in this push's series, not counting this one. */
function laterSends(push: AdminScheduledPush): number {
  if (!push.seriesId || !push.occurrence || !push.occurrenceCount) return 0;
  return Math.max(push.occurrenceCount - push.occurrence, 0);
}

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
  const [wholeSeries, setWholeSeries] = useState(false);
  const [isPending, startTransition] = useTransition();
  const later = laterSends(push);

  function cancel() {
    startTransition(async () => {
      const result = await cancelScheduledPush(push._id, wholeSeries ? 'series' : 'one');
      if (result.ok) {
        setOpen(false);
        toast.success(wholeSeries ? 'Series cancelled.' : 'Push cancelled.');
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
            “{push.title}” is set to go out {formatLagosDateTime(push.sendAt)} WAT. A cancelled
            push can’t be restored — schedule it again if you change your mind.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {later > 0 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">How much of the series to cancel</legend>
            {[
              { value: false, label: 'Just this send', hint: 'The rest of the series still goes out.' },
              {
                value: true,
                label: `This send and the ${sends(later)} after it`,
                hint: 'Sends that already went out are not affected.',
              },
            ].map((option) => (
              <label
                key={String(option.value)}
                className={cn(
                  'flex cursor-pointer gap-2.5 rounded-[10px] border p-3 text-[13px]',
                  wholeSeries === option.value
                    ? 'border-primary bg-brand-tint'
                    : 'border-border hover:bg-muted/50'
                )}
              >
                <input
                  type="radio"
                  name="cancel-scope"
                  checked={wholeSeries === option.value}
                  onChange={() => setWholeSeries(option.value)}
                  disabled={isPending}
                  className="mt-0.5 size-[15px] accent-[var(--primary)]"
                />
                <span>
                  <span className="block font-semibold text-foreground">{option.label}</span>
                  <span className="block text-[12px] text-muted-foreground">{option.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Keep it</AlertDialogCancel>
          <Button variant="destructive" onClick={cancel} disabled={isPending}>
            {isPending ? 'Cancelling…' : wholeSeries ? 'Cancel series' : 'Cancel push'}
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
  const [wholeSeries, setWholeSeries] = useState(false);
  const later = laterSends(push);

  const record: EditValues = {
    key: push._id,
    title: push.title,
    message: push.message,
    audience: push.audience,
    audienceListId: push.audienceList ?? '',
    repeatEveryDays: '',
    repeatUntil: '',
    ...utcToLagosParts(push.sendAt),
  };

  const { values, set, submit, isPending } = useEditForm<EditValues>(
    record,
    async (next) => {
      const result = await updateScheduledPush(
        push._id,
        draftToPayload(next),
        wholeSeries ? 'series' : 'one'
      );
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
            {push.seriesId && push.occurrence && push.occurrenceCount
              ? `${repeatLabel(push.repeatEveryDays)} · send ${push.occurrence} of ${push.occurrenceCount}. Changes apply until it starts sending.`
              : 'Changes apply until the push starts sending.'}
          </DialogDescription>
        </DialogHeader>

        <ScheduleRowEditor
          draft={values}
          lists={lists}
          errors={errors}
          showEmptyErrors={saveAttempted}
          onChange={set}
          disabled={isPending}
          showRepeat={false}
        />

        {later > 0 && (
          <label className="flex cursor-pointer gap-2.5 rounded-[10px] border border-border p-3 text-[13px]">
            <input
              type="checkbox"
              checked={wholeSeries}
              onChange={(e) => setWholeSeries(e.target.checked)}
              disabled={isPending}
              className="mt-0.5 size-[15px] accent-[var(--primary)]"
            />
            <span>
              <span className="block font-semibold text-foreground">
                Also apply to the {sends(later)} after this one
              </span>
              <span className="block text-[12px] text-muted-foreground">
                The wording and audience are shared; each send keeps its own date and time.
              </span>
            </span>
          </label>
        )}

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
