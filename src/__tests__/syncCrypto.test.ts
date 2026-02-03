import { describe, expect, it } from 'vitest';
import { decryptSyncEnvelope, encryptSyncPayload } from '../lib/sync/crypto';
import { SYNC_PAYLOAD_VERSION } from '../lib/sync/types';
import { CURRENT_SCHEMA_VERSION, DEFAULT_SETTINGS } from '../types';

const basePayload = {
  payloadVersion: SYNC_PAYLOAD_VERSION,
  schemaVersion: CURRENT_SCHEMA_VERSION,
  deviceId: 'device-1',
  updatedAt: new Date().toISOString(),
  revision: 1,
  data: {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    fills: [],
    fillFingerprints: [],
    settings: DEFAULT_SETTINGS,
    importHistory: [],
    adjustments: [],
    pendingOrders: [],
  },
};

describe('sync crypto', () => {
  it('encrypts and decrypts payloads', async () => {
    const encrypted = await encryptSyncPayload(basePayload, 'correct horse battery staple');
    const decrypted = await decryptSyncEnvelope(encrypted, 'correct horse battery staple');
    expect(decrypted.data.settings.startingEquity).toBe(basePayload.data.settings.startingEquity);
  });

  it('fails on wrong passphrase', async () => {
    const encrypted = await encryptSyncPayload(basePayload, 'pass-1');
    await expect(decryptSyncEnvelope(encrypted, 'pass-2')).rejects.toThrow('Unable to decrypt');
  });

  it('fails on tampered ciphertext', async () => {
    const encrypted = await encryptSyncPayload(basePayload, 'pass-1');
    const tampered = encrypted.replace(/"ciphertext":"[^"]+"/, '"ciphertext":"AAAA"');
    await expect(decryptSyncEnvelope(tampered, 'pass-1')).rejects.toThrow('Unable to decrypt');
  });

  it('fails on unsupported envelope versions', async () => {
    const encrypted = await encryptSyncPayload(basePayload, 'pass-1');
    const mutated = encrypted.replace(/"v":\d+/, '"v":999');
    await expect(decryptSyncEnvelope(mutated, 'pass-1')).rejects.toThrow('version');
  });
});
