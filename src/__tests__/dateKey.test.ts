import { describe, expect, test } from 'vitest';
import { epochDayToIso, isoToEpochDay, normalizeDateKey, toETDateKey } from '../lib/dateKey';

describe('dateKey utilities', () => {
  test('normalizeDateKey accepts ISO and MM/DD/YYYY', () => {
    expect(normalizeDateKey('2026-01-15')).toBe('2026-01-15');
    expect(normalizeDateKey('1/5/2026')).toBe('2026-01-05');
  });

  test('normalizeDateKey rejects absurd years and invalid timestamps', () => {
    expect(normalizeDateKey('275760-09-13')).toBeNull();
    expect(normalizeDateKey(Date.UTC(1800, 0, 1))).toBeNull();
  });

  test('isoToEpochDay and epochDayToIso round-trip', () => {
    const epoch = isoToEpochDay('2026-02-10');
    expect(epochDayToIso(epoch)).toBe('2026-02-10');
  });

  test('toETDateKey is stable around UTC midnight boundaries', () => {
    expect(toETDateKey(new Date('2026-01-02T00:30:00Z'))).toBe('2026-01-01');
    expect(toETDateKey(new Date('2026-01-02T05:30:00Z'))).toBe('2026-01-02');
  });
});
