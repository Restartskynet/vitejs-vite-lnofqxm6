import { describe, expect, it } from 'vitest';
import { mergeSyncData } from '../lib/sync/merge';
import { CURRENT_SCHEMA_VERSION, DEFAULT_SETTINGS, DEFAULT_STRATEGY } from '../types';

const baseData = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  fills: [],
  fillFingerprints: [],
  settings: DEFAULT_SETTINGS,
  importHistory: [],
  adjustments: [],
  pendingOrders: [],
  strategy: DEFAULT_STRATEGY,
};

describe('mergeSyncData', () => {
  it('merges fills and keeps newest settings', () => {
    const local = {
      ...baseData,
      settings: { ...DEFAULT_SETTINGS, startingEquity: 10000 },
      fills: [
        {
          id: '1',
          fingerprint: 'fp-1',
          symbol: 'AAPL',
          side: 'BUY' as const,
          quantity: 1,
          price: 100,
          filledTime: new Date('2024-01-01').toISOString(),
          orderId: 'o1',
          commission: 1,
          marketDate: '2024-01-01',
        },
      ],
      fillFingerprints: ['fp-1'],
    };
    const remote = {
      ...baseData,
      settings: { ...DEFAULT_SETTINGS, startingEquity: 20000 },
      fills: [
        {
          id: '2',
          fingerprint: 'fp-2',
          symbol: 'MSFT',
          side: 'SELL' as const,
          quantity: 2,
          price: 200,
          filledTime: new Date('2024-02-01').toISOString(),
          orderId: 'o2',
          commission: 2,
          marketDate: '2024-02-01',
        },
      ],
      fillFingerprints: ['fp-2'],
    };

    const result = mergeSyncData(local, remote, '2024-02-01T00:00:00.000Z', '2024-03-01T00:00:00.000Z');
    expect(result.merged.fills).toHaveLength(2);
    expect(result.merged.settings.startingEquity).toBe(20000);
  });

  it('preserves the newer schemaVersion when remote is newer', () => {
    const local = { ...baseData, schemaVersion: 1 };
    const remote = { ...baseData, schemaVersion: CURRENT_SCHEMA_VERSION + 2 };

    const result = mergeSyncData(local, remote, '2024-02-01T00:00:00.000Z', '2024-03-01T00:00:00.000Z');
    expect(result.merged.schemaVersion).toBe(remote.schemaVersion);
    expect(result.merged.schemaVersion).toBeGreaterThan(CURRENT_SCHEMA_VERSION);
  });

  it('preserves the newer schemaVersion when local is newer', () => {
    const local = { ...baseData, schemaVersion: CURRENT_SCHEMA_VERSION + 3 };
    const remote = { ...baseData, schemaVersion: CURRENT_SCHEMA_VERSION };

    const result = mergeSyncData(local, remote, '2024-02-01T00:00:00.000Z', '2024-03-01T00:00:00.000Z');
    expect(result.merged.schemaVersion).toBe(local.schemaVersion);
  });

  it('handles missing or invalid schemaVersion defensively', () => {
    const local = { ...baseData, schemaVersion: Number.NaN } as typeof baseData;
    const remote = { ...baseData, schemaVersion: 4 } as typeof baseData;

    const result = mergeSyncData(local, remote, '2024-02-01T00:00:00.000Z', '2024-03-01T00:00:00.000Z');
    expect(result.merged.schemaVersion).toBe(4);
  });

  it('flags conflicts when updates are close', () => {
    const local = { ...baseData, settings: { ...DEFAULT_SETTINGS, startingEquity: 10000 } };
    const remote = { ...baseData, settings: { ...DEFAULT_SETTINGS, startingEquity: 20000 } };

    const result = mergeSyncData(local, remote, '2024-02-01T00:00:00.000Z', '2024-02-01T00:02:00.000Z');
    expect(result.conflicts).toContain('settings');
  });
});
