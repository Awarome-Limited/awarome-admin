'use client';

import { useState } from 'react';
import { AdminAudienceList } from '@/lib/types';
import { broadcastPushNotification } from '../actions';
import { ComposeForm } from './compose-form';
import { AudienceListsManager } from './audience-lists-manager';
import { PushPreviewCard } from './push-preview-card';

export function PushNotificationsClient({
  initialLists,
}: {
  initialLists: AdminAudienceList[];
}) {
  const [audienceLists, setAudienceLists] = useState<AdminAudienceList[]>(initialLists);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewBody, setPreviewBody] = useState('');

  function handleListCreated(newList: AdminAudienceList) {
    setAudienceLists((prev) => [newList, ...prev]);
  }

  return (
    <div className="flex flex-col gap-[18px]">
      {/* Compose + Preview grid */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.55fr_1fr]">
        <div className="rounded-[14px] border border-border bg-card p-[22px_24px] shadow-[var(--shadow-card)]">
          <div className="mb-[18px] text-[15px] font-semibold text-foreground">Compose</div>
          <ComposeForm
            action={broadcastPushNotification}
            audienceLists={audienceLists}
            onTitleChange={setPreviewTitle}
            onBodyChange={setPreviewBody}
          />
        </div>

        <div className="flex flex-col rounded-[14px] border border-border bg-card p-[22px_24px] shadow-[var(--shadow-card)]">
          <div className="mb-1.5 text-[15px] font-semibold text-foreground">Preview</div>
          <div className="mb-[18px] text-[12.5px] text-muted-foreground">
            How it appears on a device.
          </div>
          <div
            className="flex-1 rounded-[18px] p-4"
            style={{ background: 'linear-gradient(150deg, var(--brand-tint), var(--muted, #f4f5f7))' }}
          >
            <PushPreviewCard title={previewTitle} body={previewBody} />
          </div>
        </div>
      </div>

      {/* Audience lists header */}
      <div className="flex flex-wrap items-end justify-between gap-3 pt-1">
        <div>
          <h2 className="text-[17px] font-bold tracking-tight text-foreground">
            Audience lists
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Upload a CSV of phone numbers to create a reusable, targetable audience.
          </p>
        </div>
      </div>

      <AudienceListsManager lists={audienceLists} onListCreated={handleListCreated} />
    </div>
  );
}
