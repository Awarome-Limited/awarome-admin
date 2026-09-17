import { parseCsvRecords, toCsv } from '@/lib/csv';

// Mirrors src/modules/notifications/constants + types in awarome-BE.
export const PUSH_AUDIENCES = ['customers', 'vendors', 'riders', 'everyone', 'list'] as const;
export type PushAudience = (typeof PUSH_AUDIENCES)[number];

export const AUDIENCE_LABELS: Record<PushAudience, string> = {
  customers: 'All customers',
  vendors: 'All vendors',
  riders: 'All riders',
  everyone: 'Everyone',
  list: 'Saved list',
};

export const TITLE_MAX = 100;
export const MESSAGE_MAX = 178;
export const MAX_ROWS = 100;
export const DEFAULT_SEND_TIME = '09:00';

// The API wants a minute of lead time; two leaves room for the page to sit
// open while someone reviews.
const MIN_LEAD_MS = 2 * 60 * 1000;
const LAGOS_OFFSET_MS = 60 * 60 * 1000; // UTC+1 year-round, no DST

export interface AudienceListOption {
  _id: string;
  name: string;
}

export interface PushDraft {
  key: string;
  title: string;
  message: string;
  audience: PushAudience | '';
  audienceListId: string;
  /** YYYY-MM-DD, Lagos calendar day. */
  date: string;
  /** HH:MM, 24-hour Lagos time. */
  time: string;
  /**
   * What the CSV said when a value could not be read. Shown while the field is
   * still empty, so fixing the field is what clears it.
   */
  hints?: Partial<Record<DraftField, string>>;
}

export type DraftField = 'title' | 'message' | 'audience' | 'audienceListId' | 'date' | 'time';
export type DraftErrors = Partial<Record<DraftField, string>>;

let keySeq = 0;
export const draftKey = () => `draft-${Date.now().toString(36)}-${keySeq++}`;

const pad = (n: number) => String(n).padStart(2, '0');

/** YYYY-MM-DD for the Lagos calendar day `days` after today. */
export function lagosDate(days = 0, from: Date = new Date()): string {
  return new Date(from.getTime() + LAGOS_OFFSET_MS + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return date;
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** A Lagos wall-clock date and time as a UTC ISO instant, or null if unreal. */
export function lagosToUtcIso(date: string, time: string): string | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dateMatch || !timeMatch) return null;

  const [, y, mo, d] = dateMatch.map(Number);
  const [, h, mi] = timeMatch.map(Number);
  if (h > 23 || mi > 59) return null;

  const utc = Date.UTC(y, mo - 1, d, h, mi) - LAGOS_OFFSET_MS;
  // Date.UTC rolls 30 Feb into March; a round trip catches it.
  const check = new Date(utc + LAGOS_OFFSET_MS);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) {
    return null;
  }
  return new Date(utc).toISOString();
}

export function utcToLagosParts(iso: string): { date: string; time: string } {
  const shifted = new Date(new Date(iso).getTime() + LAGOS_OFFSET_MS);
  return {
    date: shifted.toISOString().slice(0, 10),
    time: `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`,
  };
}

export function blankDraft(overrides: Partial<PushDraft> = {}): PushDraft {
  return {
    key: draftKey(),
    title: '',
    message: '',
    audience: 'customers',
    audienceListId: '',
    date: lagosDate(1),
    time: DEFAULT_SEND_TIME,
    ...overrides,
  };
}

export function validateDraft(
  draft: PushDraft,
  lists: AudienceListOption[],
  now: number = Date.now()
): DraftErrors {
  const errors: DraftErrors = {};
  const hint = (field: DraftField) => draft.hints?.[field];

  const title = draft.title.trim();
  if (!title) errors.title = hint('title') ?? 'Add a title';
  else if (title.length > TITLE_MAX) errors.title = `Keep the title to ${TITLE_MAX} characters`;

  const message = draft.message.trim();
  if (!message) errors.message = hint('message') ?? 'Add a message';
  else if (message.length > MESSAGE_MAX)
    errors.message = `${message.length} characters — push messages are cut off after ${MESSAGE_MAX}`;

  if (!draft.audience) {
    errors.audience = hint('audience') ?? 'Choose an audience';
  } else if (draft.audience === 'list' && !lists.some((l) => l._id === draft.audienceListId)) {
    errors.audienceListId = hint('audienceListId') ?? 'Choose a saved list';
  }

  if (!draft.date) errors.date = hint('date') ?? 'Pick a date';
  if (!draft.time) errors.time = hint('time') ?? 'Pick a time';

  if (draft.date && draft.time) {
    const iso = lagosToUtcIso(draft.date, draft.time);
    if (!iso) errors.date = 'Not a real date and time';
    else if (new Date(iso).getTime() < now + MIN_LEAD_MS)
      errors.time = 'Must be at least 2 minutes from now';
  }

  return errors;
}

export const hasErrors = (errors: DraftErrors) => Object.keys(errors).length > 0;

export function draftToPayload(draft: PushDraft) {
  return {
    title: draft.title.trim(),
    message: draft.message.trim(),
    audience: draft.audience as PushAudience,
    ...(draft.audience === 'list' ? { audienceListId: draft.audienceListId } : {}),
    sendAt: lagosToUtcIso(draft.date, draft.time) as string,
  };
}

export type ScheduledPushPayload = ReturnType<typeof draftToPayload>;

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

export const CSV_COLUMNS = ['title', 'message', 'audience', 'audience_list', 'date', 'time'] as const;
const REQUIRED_COLUMNS = ['title', 'message', 'audience', 'date', 'time'];

const AUDIENCE_ALIASES: Record<string, PushAudience> = {
  customers: 'customers',
  customer: 'customers',
  'all customers': 'customers',
  vendors: 'vendors',
  vendor: 'vendors',
  'all vendors': 'vendors',
  riders: 'riders',
  rider: 'riders',
  'all riders': 'riders',
  everyone: 'everyone',
  all: 'everyone',
  list: 'list',
  'saved list': 'list',
};

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function isoDate(y: number, m: number, d: number): string | null {
  if (y < 100) y += 2000;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return `${y}-${pad(m)}-${pad(d)}`;
}

/**
 * Accepts what a spreadsheet is likely to save: 2026-09-18, 18/09/2026,
 * 18-Sep-2026, 18 Sep 26. Slashed dates are day-first (Nigerian locale)
 * unless the second part can only be a day, as in US-locale 9/18/2026.
 */
export function parseCsvDate(raw: string): string | null {
  const value = raw.trim();
  let m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(value);
  if (m) return isoDate(+m[1], +m[2], +m[3]);

  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/.exec(value);
  if (m) {
    const [a, b] = [+m[1], +m[2]];
    return b > 12 && a <= 12 ? isoDate(+m[3], a, b) : isoDate(+m[3], b, a);
  }

  m = /^(\d{1,2})[\s-]+([a-z]{3,})\.?[\s,-]+(\d{2,4})$/i.exec(value);
  if (m) {
    const month = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase());
    return month < 0 ? null : isoDate(+m[3], month + 1, +m[1]);
  }

  return null;
}

/** 09:00, 9:00, 09:00:00, 9:00 AM, 9am, 9 pm. */
export function parseCsvTime(raw: string): string | null {
  const m = /^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*([ap])\.?\s*m\.?$/i.exec(raw.trim())
    ?? /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(raw.trim());
  if (!m) return null;

  let hours = +m[1];
  const minutes = m[2] ? +m[2] : 0;
  const meridiem = m[3]?.toLowerCase();
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    if (meridiem === 'p' && hours !== 12) hours += 12;
    if (meridiem === 'a' && hours === 12) hours = 0;
  }
  if (hours > 23 || minutes > 59) return null;
  return `${pad(hours)}:${pad(minutes)}`;
}

export interface ScheduleCsvResult {
  rows: PushDraft[];
  /** Problems with the file itself, not any one row. */
  fileErrors: string[];
}

export function parseScheduleCsv(text: string, lists: AudienceListOption[]): ScheduleCsvResult {
  const { headers, records } = parseCsvRecords(text);

  const missing = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
  if (!headers.length) return { rows: [], fileErrors: ['The file is empty.'] };
  if (missing.length) {
    return {
      rows: [],
      fileErrors: [
        `Missing column${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}. Download the template to see the expected headings.`,
      ],
    };
  }
  if (!records.length) return { rows: [], fileErrors: ['The file has headings but no rows.'] };

  const rows = records.map(({ values }) => {
    const hints: PushDraft['hints'] = {};
    const listName = values.audience_list ?? '';

    const rawAudience = values.audience.toLowerCase().replace(/\s+/g, ' ');
    // A row that names a list but leaves audience blank clearly means that list.
    const audience: PushDraft['audience'] =
      AUDIENCE_ALIASES[rawAudience] ?? (!rawAudience && listName ? 'list' : '');
    if (!audience) {
      hints.audience = rawAudience
        ? `Unknown audience “${values.audience}”`
        : 'Choose an audience';
    }

    let audienceListId = '';
    if (audience === 'list') {
      const match = lists.find((l) => l.name.trim().toLowerCase() === listName.toLowerCase());
      if (match) audienceListId = match._id;
      else hints.audienceListId = listName ? `No saved list named “${listName}”` : 'Name a saved list';
    }

    const date = values.date ? parseCsvDate(values.date) : null;
    if (values.date && !date) hints.date = `Could not read the date “${values.date}”`;

    const time = values.time ? parseCsvTime(values.time) : null;
    if (values.time && !time) hints.time = `Could not read the time “${values.time}”`;

    return blankDraft({
      title: values.title,
      message: values.message,
      audience,
      audienceListId,
      date: date ?? '',
      time: time ?? '',
      hints,
    });
  });

  return { rows, fileErrors: [] };
}

export function buildTemplateCsv(lists: AudienceListOption[]): string {
  const tomorrow = lagosDate(1);
  const nextDay = lagosDate(2);
  return toCsv([
    {
      title: 'Breakfast is on us ☕',
      message: 'Get 10% off your first order before 11am. Tap to shop now.',
      audience: 'customers',
      audience_list: '',
      date: tomorrow,
      time: '09:00',
    },
    {
      title: 'Rain expected this afternoon',
      message: 'Pack your rain gear and ride safe. Extra bonus on deliveries after 4pm.',
      audience: 'riders',
      audience_list: '',
      date: tomorrow,
      time: '12:30',
    },
    {
      title: 'Weekend orders are coming',
      message: 'Update your stock and opening hours so customers can find you this weekend.',
      audience: lists.length ? 'list' : 'vendors',
      audience_list: lists[0]?.name ?? '',
      date: nextDay,
      time: '17:00',
    },
  ]);
}
