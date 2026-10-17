'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CornerDownLeft, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type { NavWorkspace } from '@/lib/nav-items';
import { cn } from '@/lib/utils';
import { startNavigationProgress } from '@/components/navigation-progress';

/** "Jump to anything": ⌘K / Ctrl+K opens a filterable list of every page the user can see. */
export function CommandPalette({
  workspaces,
  open,
  onOpenChange,
}: {
  workspaces: NavWorkspace[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpenChange(!open);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return workspaces
      .flatMap((w) => w.items.map((item) => ({ ...item, workspace: w.label })))
      .filter(
        (item) =>
          !q || item.label.toLowerCase().includes(q) || item.workspace.toLowerCase().includes(q)
      );
  }, [workspaces, query]);

  function go(href: string) {
    onOpenChange(false);
    startNavigationProgress();
    router.push(href);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setQuery('');
          setCursor(0);
        }
      }}
    >
      <DialogContent showClose={false} className="top-[18vh] translate-y-0 gap-0 p-0">
        <DialogTitle className="sr-only">Jump to a page</DialogTitle>
        <div className="flex items-center gap-2.5 border-b border-border px-4">
          <Search className="size-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setCursor(0);
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setCursor((c) => Math.min(c + 1, results.length - 1));
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              } else if (event.key === 'Enter' && results[cursor]) {
                event.preventDefault();
                go(results[cursor].href);
              }
            }}
            placeholder="Jump to a page"
            className="h-[52px] flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {results.map((item, index) => (
            <li key={item.href}>
              <button
                type="button"
                onMouseEnter={() => setCursor(index)}
                onClick={() => go(item.href)}
                className={cn(
                  'flex h-10 w-full items-center gap-3 rounded-[8px] px-3 text-left text-[14px]',
                  index === cursor && 'bg-muted'
                )}
              >
                <span className="font-medium">{item.label}</span>
                <span className="text-[12.5px] text-muted-foreground">{item.workspace}</span>
                {index === cursor && (
                  <CornerDownLeft className="ml-auto size-3.5 text-muted-foreground" />
                )}
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-3 py-8 text-center text-[14px] text-muted-foreground">
              No page matches “{query}”.
            </li>
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
