'use client';

import { useState } from 'react';
import { AdminAudienceList } from '@/lib/types';
import { broadcastPushNotification } from '../actions';
import { ComposeForm } from './compose-form';
import { AudienceListsManager } from './audience-lists-manager';
import { LockScreen, PushPreviewCard } from './push-preview-card';
import { Panel } from '@/components/page';

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
    <div className="flex flex-col gap-7">
      <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
        <Panel title="Compose">
          <ComposeForm
            action={broadcastPushNotification}
            audienceLists={audienceLists}
            onTitleChange={setPreviewTitle}
            onBodyChange={setPreviewBody}
          />
        </Panel>

        <div className="flex flex-col gap-3 lg:sticky lg:top-6">
          <span className="text-[12px] font-medium tracking-[0.08em] text-muted-foreground uppercase">Preview</span>
          <LockScreen>
            <PushPreviewCard title={previewTitle} body={previewBody} />
          </LockScreen>
        </div>
      </section>

      <Panel
        flush
        title="Audience lists"
        description="Upload a CSV of phone numbers to create a reusable, targetable audience."
      >
        <div className="p-5">
          <AudienceListsManager lists={audienceLists} onListCreated={handleListCreated} />
        </div>
      </Panel>
    </div>
  );
}
