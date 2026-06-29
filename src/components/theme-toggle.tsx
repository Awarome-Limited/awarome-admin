'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';

const STORAGE_KEY = 'awarome.dark';
const THEME_EVENT = 'awarome-theme-change';

function subscribe(callback: () => void) {
  window.addEventListener(THEME_EVENT, callback);
  return () => window.removeEventListener(THEME_EVENT, callback);
}

function getSnapshot() {
  return document.documentElement.classList.contains('dark');
}

function getServerSnapshot() {
  return false;
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    // Persist in cookie so the server can apply the class on next render (no flash)
    document.cookie = `awarome.theme=${next ? 'dark' : 'light'}; path=/; max-age=31536000; SameSite=Lax`;
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title="Toggle theme"
      className="flex size-9 items-center justify-center rounded-lg border border-border-strong bg-card text-foreground-secondary transition-colors hover:bg-secondary"
    >
      {dark ? <Sun className="size-[17px]" /> : <Moon className="size-[17px]" />}
    </button>
  );
}
