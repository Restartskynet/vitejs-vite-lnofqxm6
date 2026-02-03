import type { SyncData, SyncMergeResult } from './types';
import { generateFillFingerprint, generatePendingOrderFingerprint } from '../hash';
import type { PersistedFill, PersistedPendingOrder } from '../../types/importHistory';

const CONFLICT_WINDOW_MS = 5 * 60 * 1000;

const deepEqual = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

const normalizeSchemaVersion = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

const sortFills = (fills: PersistedFill[]): PersistedFill[] =>
  [...fills].sort((a, b) => {
    const timeDiff = new Date(a.filledTime).getTime() - new Date(b.filledTime).getTime();
    if (timeDiff !== 0) return timeDiff;
    return (a.rowIndex ?? 0) - (b.rowIndex ?? 0);
  });

const mergePendingOrders = (local: PersistedPendingOrder[], remote: PersistedPendingOrder[]): PersistedPendingOrder[] => {
  const seen = new Set(
    local.map((po) =>
      generatePendingOrderFingerprint(
        po.symbol,
        po.side,
        po.quantity,
        po.price,
        po.stopPrice,
        po.limitPrice,
        new Date(po.placedTime),
        po.type
      )
    )
  );

  const merged = [...local];
  for (const po of remote) {
    const fp = generatePendingOrderFingerprint(
      po.symbol,
      po.side,
      po.quantity,
      po.price,
      po.stopPrice,
      po.limitPrice,
      new Date(po.placedTime),
      po.type
    );
    if (!seen.has(fp)) {
      merged.push(po);
      seen.add(fp);
    }
  }
  return merged;
};

export function mergeSyncData(local: SyncData, remote: SyncData, localUpdatedAt: string, remoteUpdatedAt: string): SyncMergeResult {
  const mergedFillsMap = new Map<string, PersistedFill>();
  const addFill = (fill: PersistedFill) => {
    const fp = fill.fingerprint || generateFillFingerprint(fill.symbol, fill.side, fill.quantity, fill.price, new Date(fill.filledTime));
    mergedFillsMap.set(fp, { ...fill, fingerprint: fp });
  };

  local.fills.forEach(addFill);
  remote.fills.forEach(addFill);

  const mergedFills = sortFills(Array.from(mergedFillsMap.values()));
  const mergedFingerprints = mergedFills.map((fill) => fill.fingerprint || fill.id);

  const historyById = new Map(local.importHistory.map((entry) => [entry.id, entry]));
  remote.importHistory.forEach((entry) => historyById.set(entry.id, entry));
  const mergedHistory = Array.from(historyById.values()).sort((a, b) => b.importedAt.localeCompare(a.importedAt)).slice(0, 50);

  const adjustmentsById = new Map(local.adjustments.map((adj) => [adj.id, adj]));
  remote.adjustments.forEach((adj) => adjustmentsById.set(adj.id, adj));
  const mergedAdjustments = Array.from(adjustmentsById.values());

  const mergedPendingOrders = mergePendingOrders(local.pendingOrders ?? [], remote.pendingOrders ?? []);

  const localTime = new Date(localUpdatedAt).getTime();
  const remoteTime = new Date(remoteUpdatedAt).getTime();
  const chooseRemote = remoteTime > localTime;
  const localSchemaVersion = normalizeSchemaVersion(local.schemaVersion);
  const remoteSchemaVersion = normalizeSchemaVersion(remote.schemaVersion);
  const preferRemoteBase = remoteSchemaVersion > localSchemaVersion || (remoteSchemaVersion === localSchemaVersion && chooseRemote);
  const mergedBase = preferRemoteBase ? { ...local, ...remote } : { ...remote, ...local };

  const schemaPrefersRemote = remoteSchemaVersion > localSchemaVersion;
  const schemaPrefersLocal = localSchemaVersion > remoteSchemaVersion;
  const mergedSettings = schemaPrefersRemote
    ? remote.settings
    : schemaPrefersLocal
      ? local.settings
      : chooseRemote
        ? remote.settings
        : local.settings;
  const mergedStrategy = schemaPrefersRemote
    ? remote.strategy
    : schemaPrefersLocal
      ? local.strategy
      : chooseRemote
        ? remote.strategy
        : local.strategy;

  const conflicts: SyncMergeResult['conflicts'] = [];
  if (Math.abs(remoteTime - localTime) <= CONFLICT_WINDOW_MS) {
    if (!deepEqual(local.settings, remote.settings)) {
      conflicts.push('settings');
    }
    if (!deepEqual(local.strategy, remote.strategy)) {
      conflicts.push('strategy');
    }
  }

  return {
    merged: {
      ...mergedBase,
      schemaVersion: Math.max(localSchemaVersion, remoteSchemaVersion),
      fills: mergedFills,
      fillFingerprints: mergedFingerprints,
      settings: mergedSettings,
      importHistory: mergedHistory,
      adjustments: mergedAdjustments,
      pendingOrders: mergedPendingOrders,
      strategy: mergedStrategy,
    },
    conflicts,
    metadata: {
      updatedAt: new Date(Math.max(localTime, remoteTime)).toISOString(),
    },
  };
}
