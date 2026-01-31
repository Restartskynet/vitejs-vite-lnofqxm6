import { describe, expect, test } from 'vitest';
import { getPresetRange, isValidRange, parseDateInput } from '../lib/dateRange';

describe('dateRange utilities', () => {
  test('parseDateInput returns null for empty or invalid values', () => {
    expect(parseDateInput('')).toBeNull();
    expect(parseDateInput('not-a-date')).toBeNull();
  });

  test('parseDateInput returns a valid Date for ISO input', () => {
    const parsed = parseDateInput('2026-01-15');
    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(0);
    expect(parsed?.getDate()).toBe(15);
  });

  test('isValidRange enforces start before end', () => {
    const start = new Date('2026-01-01T00:00:00');
    const end = new Date('2026-01-10T00:00:00');
    expect(isValidRange(start, end)).toBe(true);
    expect(isValidRange(end, start)).toBe(false);
  });

  test('getPresetRange clamps to dataset bounds', () => {
    const dataStart = new Date('2026-01-10T00:00:00');
    const dataEnd = new Date('2026-01-20T00:00:00');
    const range = getPresetRange('1M', dataStart, dataEnd);
    expect(range.start.getTime()).toBeGreaterThanOrEqual(dataStart.getTime());
    expect(range.end.getTime()).toBeGreaterThanOrEqual(range.start.getTime());
  });
});
