const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const US_DATE_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

export function isISODateKey(s: string): boolean {
  return ISO_DATE_RE.test(s);
}

function isYearInRange(year: number): boolean {
  return year >= 1990 && year <= 2100;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function formatIsoDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function parseIsoParts(value: string): { year: number; month: number; day: number } | null {
  if (!isISODateKey(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!isYearInRange(year)) return null;
  const time = Date.UTC(year, month - 1, day);
  const check = new Date(time);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() + 1 !== month ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function normalizeDateKey(
  input: string | number | Date | null | undefined
): string | null {
  if (input === null || input === undefined) return null;

  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return null;
    const key = toETDateKey(input);
    const parts = parseIsoParts(key);
    return parts ? key : null;
  }

  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return null;
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) return null;
    const year = date.getUTCFullYear();
    if (!isYearInRange(year)) return null;
    const key = toETDateKey(date);
    const parts = parseIsoParts(key);
    return parts ? key : null;
  }

  const value = input.trim();
  if (!value) return null;

  const isoParts = parseIsoParts(value);
  if (isoParts) {
    return formatIsoDate(isoParts.year, isoParts.month, isoParts.day);
  }

  const usMatch = value.match(US_DATE_RE);
  if (usMatch) {
    const month = Number(usMatch[1]);
    const day = Number(usMatch[2]);
    const year = Number(usMatch[3]);
    if (!isYearInRange(year)) return null;
    const time = Date.UTC(year, month - 1, day);
    const check = new Date(time);
    if (
      check.getUTCFullYear() !== year ||
      check.getUTCMonth() + 1 !== month ||
      check.getUTCDate() !== day
    ) {
      return null;
    }
    return formatIsoDate(year, month, day);
  }

  return null;
}

export function isoToEpochDay(iso: string): number {
  const parts = parseIsoParts(iso);
  if (!parts) {
    throw new Error(`Invalid ISO date key: ${iso}`);
  }
  return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / 86400000);
}

export function epochDayToIso(epochDay: number): string {
  if (!Number.isFinite(epochDay)) {
    throw new Error(`Invalid epoch day: ${epochDay}`);
  }
  const time = epochDay * 86400000;
  const date = new Date(time);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return formatIsoDate(year, month, day);
}

export function toETDateKey(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);

  return formatIsoDate(year, month, day);
}
