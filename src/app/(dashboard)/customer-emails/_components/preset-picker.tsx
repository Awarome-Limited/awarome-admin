'use client';

import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  EMAIL_PRESETS,
  EMAIL_PRESET_CATEGORIES,
  templateKey,
  type EmailPreset,
  type EmailPresetCategory,
} from '@/lib/email-presets';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { deleteEmailTemplate, type SavedEmailTemplate } from '../actions';

interface PickerRow {
  key: string;
  label: string;
  summary: string;
  saved?: SavedEmailTemplate;
}

export function PresetPicker({
  selectedKey,
  savedTemplates,
  onSelectPreset,
  onSelectTemplate,
  onClear,
  onDeleted,
}: {
  selectedKey: string | null;
  savedTemplates: SavedEmailTemplate[];
  onSelectPreset: (preset: EmailPreset) => void;
  onSelectTemplate: (template: SavedEmailTemplate) => void;
  onClear: () => void;
  onDeleted: (id: string) => void;
}) {
  const [pendingDelete, setPendingDelete] = useState<SavedEmailTemplate | null>(null);
  const [isDeleting, startDelete] = useTransition();

  function rowsFor(category: EmailPresetCategory): PickerRow[] {
    // Saved first inside each group: they were written for this team's actual
    // situations, so they should be the first thing read under the heading.
    const saved: PickerRow[] = savedTemplates
      .filter((template) => template.category === category)
      // Sorted here rather than relying on fetch order, so one saved in this
      // session lands in the same place it will after the next page load.
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((template) => ({
        key: templateKey(template._id),
        label: template.name,
        summary: template.summary || 'Saved template',
        saved: template,
      }));

    const builtIn: PickerRow[] = EMAIL_PRESETS.filter(
      (preset) => preset.category === category
    ).map((preset) => ({
      key: preset.id,
      label: preset.label,
      summary: preset.summary,
    }));

    return [...saved, ...builtIn];
  }

  function handleRowClick(row: PickerRow) {
    if (row.saved) {
      onSelectTemplate(row.saved);
      return;
    }
    const preset = EMAIL_PRESETS.find((p) => p.id === row.key);
    if (preset) onSelectPreset(preset);
  }

  function confirmDelete() {
    const template = pendingDelete;
    if (!template) return;

    startDelete(async () => {
      const result = await deleteEmailTemplate(template._id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onDeleted(template._id);
      setPendingDelete(null);
      toast.success(`Deleted “${template.name}”.`);
    });
  }

  return (
    <div className="flex flex-col rounded-[14px] border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="border-b border-border p-[18px_20px_14px]">
        <div className="text-[15px] font-semibold text-foreground">Templates</div>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          Start from tested copy, then edit freely — or save your own.
        </p>
        <button
          type="button"
          onClick={onClear}
          className={cn(
            'mt-3 w-full rounded-[9px] border px-3 py-2 text-left text-[13px] font-semibold transition-colors',
            selectedKey === null
              ? 'border-transparent bg-brand-tint text-primary'
              : 'border-border-strong bg-card text-foreground-secondary hover:bg-muted'
          )}
        >
          Custom email
          <span className="mt-0.5 block text-[11.5px] font-normal text-muted-foreground">
            Write it from scratch.
          </span>
        </button>
      </div>

      <div className="max-h-[560px] overflow-y-auto p-2">
        {EMAIL_PRESET_CATEGORIES.map((category) => {
          const rows = rowsFor(category);
          if (rows.length === 0) return null;

          return (
            <div key={category} className="mb-1.5">
              <div className="px-2.5 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-[.04em] text-muted-foreground">
                {category}
              </div>
              {rows.map((row) => {
                const active = row.key === selectedKey;
                return (
                  <div
                    key={row.key}
                    className={cn(
                      'group/row relative mb-0.5 rounded-[9px] transition-colors',
                      active ? 'bg-brand-tint' : 'hover:bg-muted'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handleRowClick(row)}
                      className="block w-full rounded-[9px] px-2.5 py-2 pr-8 text-left"
                    >
                      <span className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'truncate text-[13px] font-semibold',
                            active ? 'text-primary' : 'text-foreground'
                          )}
                        >
                          {row.label}
                        </span>
                        {row.saved && (
                          <span className="shrink-0 rounded-[4px] bg-info-bg px-1.5 py-px text-[9.5px] font-bold uppercase tracking-[.04em] text-info">
                            Saved
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-[11.5px] leading-[1.45] text-muted-foreground">
                        {row.summary}
                      </span>
                    </button>

                    {row.saved && (
                      <button
                        type="button"
                        onClick={() => setPendingDelete(row.saved!)}
                        aria-label={`Delete ${row.label}`}
                        title={`Delete ${row.label}`}
                        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-[6px] text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover/row:opacity-100"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <Dialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{pendingDelete?.name}”?</DialogTitle>
            <DialogDescription>
              This removes the template for everyone on the team. Emails already
              sent from it are unaffected, and the copy is kept in the activity
              log if you need to rebuild it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting…' : 'Delete template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
