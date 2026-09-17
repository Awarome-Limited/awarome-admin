import { parseCsv } from '@/lib/csv';

export interface ParsedContacts {
  phones: string[];
  emails: string[];
  invalid: string[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Column headings people leave in a pasted block or a CSV.
const HEADER_WORDS = new Set([
  'phone',
  'phones',
  'phone number',
  'phone_number',
  'email',
  'emails',
  'email address',
  'email_address',
  'contact',
  'contacts',
]);

/**
 * Nigerian numbers to the 234XXXXXXXXXX shape the API matches on.
 * Excel strips the leading zero from 08031234567, so a bare 10-digit number
 * starting 7, 8 or 9 is treated as that same number.
 */
export function normalizePhone(raw: string): string | null {
  let phone = raw.replace(/[\s"'()\-.]/g, '');
  if (phone.startsWith('+')) phone = phone.slice(1);
  if (phone.startsWith('0')) phone = '234' + phone.slice(1);
  if (/^[789]\d{9}$/.test(phone)) phone = '234' + phone;
  return /^\d{10,15}$/.test(phone) ? phone : null;
}

/**
 * Splits pasted text on commas, semicolons, tabs and line breaks. Anything
 * with an @ is an email, anything else must be a phone number. Duplicates are
 * dropped (emails case-insensitively, keeping the first spelling, since older
 * accounts may store mixed case).
 */
export function parseContacts(input: string): ParsedContacts {
  const phones = new Set<string>();
  const emails = new Map<string, string>();
  const invalid = new Set<string>();

  const tokens = input
    .split(/[,;\t\r\n]+/)
    .map((token) => token.trim().replace(/^["']+|["']+$/g, '').trim())
    .filter(Boolean);

  for (const token of tokens) {
    if (HEADER_WORDS.has(token.toLowerCase())) continue;

    if (token.includes('@')) {
      if (EMAIL_RE.test(token)) {
        if (!emails.has(token.toLowerCase())) emails.set(token.toLowerCase(), token);
      } else {
        invalid.add(token);
      }
      continue;
    }

    const phone = normalizePhone(token);
    if (phone) phones.add(phone);
    else invalid.add(token);
  }

  return {
    phones: Array.from(phones),
    emails: Array.from(emails.values()),
    invalid: Array.from(invalid),
  };
}

/** Every cell of every column, so one-column phone files still work. */
export function parseContactsCsv(text: string): ParsedContacts {
  return parseContacts(parseCsv(text).flat().join('\n'));
}
