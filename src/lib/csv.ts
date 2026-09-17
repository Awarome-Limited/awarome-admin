export function toCsv(rows: Record<string, string>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return [
    headers.map(escape).join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h] ?? '')).join(',')),
  ].join('\r\n');
}

/** Browser only: hands the CSV to the user as a file download. */
export function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * RFC 4180-ish: quoted fields may hold commas, doubled quotes and line breaks,
 * which is what a push message typed into Excel turns into. Strips the BOM
 * Excel adds on "CSV UTF-8" export and drops fully blank lines.
 */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch !== '"') {
        field += ch;
      } else if (src[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = false;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
}

export interface CsvRecord {
  /** 1-based line in the file, counting the header, for error messages. */
  line: number;
  values: Record<string, string>;
}

/**
 * Rows keyed by header. Headers are matched loosely — "Audience List",
 * "audience_list" and " audience list " are the same column.
 */
export function parseCsvRecords(text: string): {
  headers: string[];
  records: CsvRecord[];
} {
  const [headerRow, ...body] = parseCsv(text);
  if (!headerRow) return { headers: [], records: [] };

  const headers = headerRow.map((h) =>
    h.trim().toLowerCase().replace(/[\s-]+/g, '_')
  );
  const records = body.map((cells, index) => ({
    line: index + 2,
    values: Object.fromEntries(
      headers.map((header, i) => [header, (cells[i] ?? '').trim()])
    ),
  }));

  return { headers, records };
}
