export type TimeframePreset = '1W' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'ALL';

export function parseDateInput(value: string): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isValidRange(start: Date | null, end: Date | null): boolean {
  if (!start || !end) return false;
  return start.getTime() <= end.getTime();
}

function clampDate(date: Date, min: Date, max: Date): Date {
  const time = Math.min(Math.max(date.getTime(), min.getTime()), max.getTime());
  return new Date(time);
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function addMonths(date: Date, months: number): Date {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

export function getPresetRange(preset: TimeframePreset, dataStart: Date, dataEnd: Date): { start: Date; end: Date } {
  const end = endOfDay(dataEnd);
  let start = startOfDay(dataStart);

  switch (preset) {
    case '1W':
      start = addDays(end, -6);
      break;
    case '1M':
      start = addMonths(end, -1);
      break;
    case '3M':
      start = addMonths(end, -3);
      break;
    case '6M':
      start = addMonths(end, -6);
      break;
    case '1Y':
      start = addMonths(end, -12);
      break;
    case 'YTD':
      start = new Date(end.getFullYear(), 0, 1);
      break;
    case 'ALL':
    default:
      start = startOfDay(dataStart);
      break;
  }

  const clampedStart = clampDate(start, dataStart, dataEnd);
  return { start: startOfDay(clampedStart), end };
}
