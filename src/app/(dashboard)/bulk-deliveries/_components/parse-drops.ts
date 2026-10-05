export interface ParsedDrop {
  name: string;
  phone: string;
  address: string;
}

// Nigerian mobile numbers as people actually type them: 0803…, +234 803…,
// 234803…, with or without spaces and dashes.
const PHONE = /(?:\+?234|0)[\s-]*[789][01](?:[\s-]*\d){8}/;

const LABELLED = /^\s*(name|receiver|customer|phone|tel|number|mobile|address|location|addr)\s*[:\-–]\s*(.*)$/i;

const tidyPhone = (raw: string) => raw.replace(/[\s-]/g, '');

const stripBullet = (line: string) =>
  line.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, '').trim();

function fromLabelled(lines: string[]): ParsedDrop[] | null {
  const drops: ParsedDrop[] = [];
  let current: ParsedDrop | null = null;
  let lastKey = '';
  for (const line of lines) {
    const m = stripBullet(line).match(LABELLED);
    if (!m) {
      // An unlabelled line straight after "Address:" is the address wrapping.
      if (current && lastKey === 'address') {
        current.address = `${current.address.replace(/[,\s]+$/, '')}, ${stripBullet(line)}`;
      }
      continue;
    }
    const [, label, value] = m;
    const raw = label.toLowerCase();
    const key = ['name', 'receiver', 'customer'].includes(raw)
      ? 'name'
      : ['phone', 'tel', 'number', 'mobile'].includes(raw)
        ? 'phone'
        : 'address';
    // Vendors paste entries back to back; a field we already have starts the next one.
    if (!current || current[key]) {
      current = { name: '', phone: '', address: '' };
      drops.push(current);
    }
    current[key] =
      key === 'phone' ? tidyPhone(value.match(PHONE)?.[0] ?? value) : value.trim();
    lastKey = key;
  }
  return drops.length ? drops : null;
}

/** One line holding everything: "Ada Obi, 08031234567, 12 Aminu Kano Cres, Wuse 2". */
function fromLine(line: string): ParsedDrop {
  const text = stripBullet(line);
  const phoneMatch = text.match(PHONE);
  if (!phoneMatch) {
    return { name: '', phone: '', address: text };
  }
  const before = text.slice(0, phoneMatch.index).replace(/[,|\t;\-–]+\s*$/, '').trim();
  const after = text
    .slice((phoneMatch.index ?? 0) + phoneMatch[0].length)
    .replace(/^\s*[,|\t;\-–]+/, '')
    .trim();
  return {
    name: before,
    phone: tidyPhone(phoneMatch[0]),
    address: after,
  };
}

/** A block of loose lines: the phone is found by shape, the first other line is the name. */
function fromBlock(lines: string[]): ParsedDrop {
  const cleaned = lines.map(stripBullet).filter(Boolean);
  const phoneIndex = cleaned.findIndex((line) => PHONE.test(line));
  const phone = phoneIndex >= 0 ? tidyPhone(cleaned[phoneIndex].match(PHONE)![0]) : '';
  const rest = cleaned.filter((_, i) => i !== phoneIndex);
  return { name: rest[0] ?? '', phone, address: rest.slice(1).join(', ') };
}

/**
 * Turns a pasted WhatsApp message into drops. Accepts the three shapes vendors
 * actually send: labelled blocks ("Name: … / Phone: … / Address: …"), loose
 * blocks separated by blank lines, and one drop per line.
 */
export function parseDrops(text: string): ParsedDrop[] {
  const blocks = text
    .replace(/\r/g, '')
    .split(/\n\s*\n/)
    .map((block) => block.split('\n').filter((line) => line.trim()))
    .filter((block) => block.length);

  const drops: ParsedDrop[] = [];
  for (const block of blocks) {
    const labelled = fromLabelled(block);
    if (labelled) {
      drops.push(...labelled);
      continue;
    }
    // Several phone numbers in one block means one drop per line.
    const phones = block.filter((line) => PHONE.test(line)).length;
    if (block.length === 1 || phones > 1) {
      drops.push(...block.map(fromLine));
    } else {
      drops.push(fromBlock(block));
    }
  }
  return drops.filter((d) => d.name || d.phone || d.address);
}
