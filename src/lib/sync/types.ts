import type { PersistedData } from '../../types/importHistory';
import type { StrategyConfig } from '../../engine/types';

export const SYNC_PAYLOAD_VERSION = 1;
export const SYNC_ENVELOPE_VERSION = 1;

export type SyncData = PersistedData & { strategy?: StrategyConfig };

export interface SyncPayload {
  payloadVersion: number;
  schemaVersion: number;
  deviceId: string;
  updatedAt: string;
  revision: number;
  data: SyncData;
}

export interface CiphertextEnvelope {
  v: number;
  payloadVersion: number;
  schemaVersion: number;
  deviceId: string;
  updatedAt: string;
  revision: number;
  kdf: {
    name: 'PBKDF2';
    hash: 'SHA-256';
    iterations: number;
    salt: string;
  };
  cipher: {
    name: 'AES-GCM';
    iv: string;
  };
  ciphertext: string;
}

export interface SyncSnapshot {
  revision: number;
  deviceId: string;
  updatedAt: string;
  payloadVersion: number;
  schemaVersion: number;
  ciphertext: string;
}

export type SyncConflictKey = 'settings' | 'strategy';

export interface SyncMergeResult {
  merged: SyncData;
  conflicts: SyncConflictKey[];
  metadata: {
    updatedAt: string;
  };
}
