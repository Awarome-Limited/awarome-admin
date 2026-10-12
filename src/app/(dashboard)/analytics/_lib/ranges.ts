// Date ranges are inclusive pairs of Lagos calendar dates (YYYY-MM-DD) — the
// same shape the summary endpoint takes. Plain strings, so the server page and
// the client picker resolve presets identically.

export const RANGE_PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7', label: 'Last 7 days' },
  { key: 'last30', label: 'Last 30 days' },
  { key: 'last90', label: 'Last 90 days' },
  { key: 'thisWeek', label: 'This week' },
  { key: 'lastWeek', label: 'Last week' },
  { key: 'thisMonth', label: 'This month' },
  { key: 'lastMonth', label: 'Last month' },
  { key: 'thisYear', label: 'This year' },
  { key: 'lastYear', label: 'Last year' },
  { key: 'custom', label: 'Custom range' },
] as const;

export type RangePresetKey = (typeof RANGE_PRESETS)[number]['key'];

export const DEFAULT_PRESET: RangePresetKey = 'today';

export interface DateRange {
  from: string;
  to: string;
}

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export const isDayKey = (value?: string): value is string => !!value && DAY_KEY.test(value);

export const isPresetKey = (value?: string): value is RangePresetKey =>
  RANGE_PRESETS.some((p) => p.key === value);

export const lagosToday = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(now);

const parse = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

const format = (date: Date) => date.toISOString().slice(0, 10);

const addDays = (key: string, days: number) => {
  const date = parse(key);
  date.setUTCDate(date.getUTCDate() + days);
  return format(date);
};

/** Weeks run Monday to Sunday. */
const mondayOf = (key: string) => addDays(key, -((parse(key).getUTCDay() + 6) % 7));

/** The range a preset stands for today; null for `custom`. */
export function resolvePreset(key: RangePresetKey, today = lagosToday()): DateRange | null {
  const [y, m] = today.split('-').map(Number);
  const firstOfMonth = `${y}-${String(m).padStart(2, '0')}-01`;

  switch (key) {
    case 'today':
      return { from: today, to: today };
    case 'yesterday': {
      const yesterday = addDays(today, -1);
      return { from: yesterday, to: yesterday };
    }
    case 'last7':
      return { from: addDays(today, -6), to: today };
    case 'last30':
      return { from: addDays(today, -29), to: today };
    case 'last90':
      return { from: addDays(today, -89), to: today };
    case 'thisWeek':
      return { from: mondayOf(today), to: today };
    case 'lastWeek': {
      const monday = addDays(mondayOf(today), -7);
      return { from: monday, to: addDays(monday, 6) };
    }
    case 'thisMonth':
      return { from: firstOfMonth, to: today };
    case 'lastMonth': {
      const lastDay = addDays(firstOfMonth, -1);
      return { from: `${lastDay.slice(0, 7)}-01`, to: lastDay };
    }
    case 'thisYear':
      return { from: `${y}-01-01`, to: today };
    case 'lastYear':
      return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
    case 'custom':
      return null;
  }
}
