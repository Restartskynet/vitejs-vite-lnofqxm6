import { SYNC_ENVELOPE_VERSION } from './types';
import type { CiphertextEnvelope, SyncPayload } from './types';

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

const PBKDF2_ITERATIONS = 310000;

export class SyncCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SyncCryptoError';
  }
}

const BufferRef =
  typeof globalThis !== 'undefined' && 'Buffer' in globalThis
    ? (globalThis as typeof globalThis & { Buffer: typeof Buffer }).Buffer
    : undefined;

const toBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  if (typeof btoa === 'function') {
    let binary = '';
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return btoa(binary);
  }
  return BufferRef ? BufferRef.from(bytes).toString('base64') : '';
};

const fromBase64 = (encoded: string): ArrayBuffer => {
  if (typeof atob === 'function') {
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
  if (!BufferRef) {
    throw new SyncCryptoError('Base64 decoding is not available in this environment.');
  }
  const buffer = BufferRef.from(encoded, 'base64');
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
};

const importPassphraseKey = async (passphrase: string): Promise<CryptoKey> =>
  crypto.subtle.importKey('raw', TEXT_ENCODER.encode(passphrase), 'PBKDF2', false, ['deriveKey']);

const deriveAesKey = async (
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
  extractable = false
): Promise<CryptoKey> => {
  const baseKey = await importPassphraseKey(passphrase);
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations,
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    extractable,
    ['encrypt', 'decrypt']
  );
};

export async function deriveSyncKey(
  passphrase: string,
  options: { salt?: Uint8Array; iterations?: number; extractable?: boolean } = {}
): Promise<{ key: CryptoKey; salt: Uint8Array; iterations: number }> {
  if (!passphrase.trim()) {
    throw new SyncCryptoError('Sync passphrase is required.');
  }
  const salt = options.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const iterations = options.iterations ?? PBKDF2_ITERATIONS;
  const key = await deriveAesKey(passphrase, salt, iterations, options.extractable ?? false);
  return { key, salt, iterations };
}

export async function encryptSyncPayloadWithKey(
  payload: SyncPayload,
  key: CryptoKey,
  kdf: { salt: Uint8Array; iterations: number }
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = TEXT_ENCODER.encode(JSON.stringify(payload.data));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);

  const envelope: CiphertextEnvelope = {
    v: SYNC_ENVELOPE_VERSION,
    payloadVersion: payload.payloadVersion,
    schemaVersion: payload.schemaVersion,
    deviceId: payload.deviceId,
    updatedAt: payload.updatedAt,
    revision: payload.revision,
    kdf: {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations: kdf.iterations,
      salt: toBase64(kdf.salt.buffer),
    },
    cipher: {
      name: 'AES-GCM',
      iv: toBase64(iv.buffer),
    },
    ciphertext: toBase64(ciphertext),
  };

  return JSON.stringify(envelope);
}

export async function encryptSyncPayload(payload: SyncPayload, passphrase: string): Promise<string> {
  const { key, salt, iterations } = await deriveSyncKey(passphrase);
  return encryptSyncPayloadWithKey(payload, key, { salt, iterations });
}

export async function decryptSyncEnvelopeWithKey(envelopeJson: string, key: CryptoKey): Promise<SyncPayload> {
  let envelope: CiphertextEnvelope;
  try {
    envelope = JSON.parse(envelopeJson) as CiphertextEnvelope;
  } catch (error) {
    throw new SyncCryptoError('Encrypted sync payload is not valid JSON.');
  }

  if (!envelope || envelope.v !== SYNC_ENVELOPE_VERSION) {
    throw new SyncCryptoError('Encrypted sync payload version is not supported.');
  }

  if (envelope.kdf?.name !== 'PBKDF2' || envelope.cipher?.name !== 'AES-GCM') {
    throw new SyncCryptoError('Encrypted sync payload uses an unsupported crypto format.');
  }

  const iv = new Uint8Array(fromBase64(envelope.cipher.iv));

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      fromBase64(envelope.ciphertext)
    );
    const payloadData = JSON.parse(TEXT_DECODER.decode(decrypted));

    return {
      payloadVersion: envelope.payloadVersion,
      schemaVersion: envelope.schemaVersion,
      deviceId: envelope.deviceId,
      updatedAt: envelope.updatedAt,
      revision: envelope.revision,
      data: payloadData,
    };
  } catch (error) {
    throw new SyncCryptoError('Unable to decrypt sync payload. Check your passphrase.');
  }
}

export async function decryptSyncEnvelope(envelopeJson: string, passphrase: string): Promise<SyncPayload> {
  let envelope: CiphertextEnvelope;
  try {
    envelope = JSON.parse(envelopeJson) as CiphertextEnvelope;
  } catch (error) {
    throw new SyncCryptoError('Encrypted sync payload is not valid JSON.');
  }

  if (!envelope || envelope.v !== SYNC_ENVELOPE_VERSION) {
    throw new SyncCryptoError('Encrypted sync payload version is not supported.');
  }

  if (envelope.kdf?.name !== 'PBKDF2' || envelope.cipher?.name !== 'AES-GCM') {
    throw new SyncCryptoError('Encrypted sync payload uses an unsupported crypto format.');
  }

  const salt = new Uint8Array(fromBase64(envelope.kdf.salt));
  const key = await deriveAesKey(passphrase, salt, envelope.kdf.iterations);
  return decryptSyncEnvelopeWithKey(envelopeJson, key);
}
