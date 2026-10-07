'use client';

import { Menu } from '@base-ui/react/menu';
import {
  BookmarkIcon,
  BriefcaseIcon,
  CheckIcon,
  ChevronDownIcon,
  HistoryIcon,
  HomeIcon,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DeliveryAddress } from '@/lib/types';
import type { PickupSuggestion } from '../actions';

const PREVIOUS = 'Previous bulk';

function iconFor(label: string): LucideIcon {
  if (label === 'Home') return HomeIcon;
  if (label === 'Work') return BriefcaseIcon;
  if (label === PREVIOUS) return HistoryIcon;
  return BookmarkIcon;
}

/**
 * The customer's saved addresses and recent bulk pickups, tucked behind one
 * button beside the field instead of spread across the form.
 */
export function SavedAddressMenu({
  options,
  value,
  onPick,
}: {
  options: PickupSuggestion[];
  value: DeliveryAddress | null;
  onPick: (option: PickupSuggestion) => void;
}) {
  if (!options.length) return null;

  const saved = options.filter((o) => o.label !== PREVIOUS);
  const previous = options.filter((o) => o.label === PREVIOUS);
  const groups = [
    { title: 'Saved addresses', items: saved },
    { title: 'Used on earlier bulks', items: previous },
  ].filter((g) => g.items.length);

  return (
    <Menu.Root>
      <Menu.Trigger
        className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[12.5px] font-semibold text-primary outline-none hover:bg-brand-tint focus-visible:ring-3 focus-visible:ring-ring/50 data-[popup-open]:bg-brand-tint"
      >
        Saved addresses
        <span className="rounded-full bg-brand-tint2 px-1.5 text-[11px] tabular-nums">{options.length}</span>
        <ChevronDownIcon className="size-3.5" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={4} className="isolate z-50">
          <Menu.Popup className="max-h-(--available-height) w-[min(380px,calc(100vw-32px))] origin-(--transform-origin) overflow-y-auto rounded-[12px] bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            {groups.map((group) => (
              <Menu.Group key={group.title} className="py-0.5">
                <Menu.GroupLabel className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.title}
                </Menu.GroupLabel>
                {group.items.map((option) => {
                  const Icon = iconFor(option.label);
                  const active = value?.address === option.address.address;
                  const sender = [option.sender?.name, option.sender?.phone].filter(Boolean).join(' · ');
                  return (
                    <Menu.Item
                      key={`${option.label}-${option.address.address}`}
                      onClick={() => onPick(option)}
                      className={cn(
                        'flex cursor-default items-start gap-2.5 rounded-[8px] px-2.5 py-2 outline-none select-none data-highlighted:bg-muted',
                        active && 'bg-brand-tint data-highlighted:bg-brand-tint2'
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[8px]',
                          active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        )}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-[12.5px] font-semibold text-foreground">
                          {option.label === PREVIOUS ? 'Earlier pickup' : option.label}
                        </span>
                        <span className="line-clamp-2 text-[12px] text-foreground-secondary">
                          {option.address.address}
                        </span>
                        {sender && <span className="truncate text-[11.5px] text-muted-foreground">Sender: {sender}</span>}
                      </span>
                      {active && <CheckIcon className="mt-1 size-4 shrink-0 text-primary" />}
                    </Menu.Item>
                  );
                })}
              </Menu.Group>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
