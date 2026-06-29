'use client';

import { useState } from 'react';
import { AdminAudienceList } from '@/lib/types';
import { broadcastPushNotification } from '../actions';
import { ComposeForm } from './compose-form';
import { AudienceListsManager } from './audience-lists-manager';

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
            <div className="flex gap-3 rounded-[14px] border border-border bg-card p-[13px_14px] shadow-[0_4px_14px_rgba(20,22,42,0.10)]">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[9px]">
                <img src="/white_logo.svg" alt="Awarome" className="h-9 w-9 object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-[3px] flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[.02em] text-muted-foreground">
                    Awarome
                  </span>
                  <span className="text-[11px] text-muted-foreground">now</span>
                </div>
                <div className="break-words text-[13.5px] font-bold leading-[1.35] text-foreground">
                  {previewTitle || (
                    <span className="font-normal text-muted-foreground">
                      e.g. New feature available!
                    </span>
                  )}
                </div>
                <div className="mt-0.5 break-words text-[12.5px] leading-[1.45] text-foreground-secondary">
                  {previewBody || (
                    <span className="text-muted-foreground">
                      Write your notification message here…
                    </span>
                  )}
                </div>
              </div>
            </div>
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
