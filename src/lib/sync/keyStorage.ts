const REMEMBERED_KEY_KEY = 'restart-sync-wrapped-key';
const DEVICE_SECRET_KEY = 'restart-sync-device-secret';
const PASSKEY_ID_KEY = 'restart-sync-passkey-id';

export interface WrappedSyncKey {
  wrappedKey: string;
  iv: string;
  salt: string;
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
    throw new Error('Base64 decoding is not available in this environment.');
  }
  const buffer = BufferRef.from(encoded, 'base64');
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
};

const getOrCreateDeviceSecret = (): string => {
  if (typeof window === 'undefined') return 'server-secret';
  const existing = window.localStorage.getItem(DEVICE_SECRET_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.localStorage.setItem(DEVICE_SECRET_KEY, created);
  return created;
};

export async function wrapKeyForDevice(key: CryptoKey): Promise<WrappedSyncKey> {
  const secret = getOrCreateDeviceSecret();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const baseKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveKey']);
  const wrappingKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 120000 },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  const rawKey = await crypto.subtle.exportKey('raw', key);
  const wrapped = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, wrappingKey, rawKey);

  return {
    wrappedKey: toBase64(wrapped),
    iv: toBase64(iv.buffer),
    salt: toBase64(salt.buffer),
  };
}

export async function unwrapKeyForDevice(wrapped: WrappedSyncKey): Promise<CryptoKey> {
  const secret = getOrCreateDeviceSecret();
  const baseKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveKey']);
  const salt = new Uint8Array(fromBase64(wrapped.salt));
  const iv = new Uint8Array(fromBase64(wrapped.iv));
  const wrappingKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 120000 },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  const rawKey = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, wrappingKey, fromBase64(wrapped.wrappedKey));
  return crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export function storeWrappedKey(wrapped: WrappedSyncKey): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(REMEMBERED_KEY_KEY, JSON.stringify(wrapped));
}

export function loadWrappedKey(): WrappedSyncKey | null {
  if (typeof window === 'undefined') return null;
  const stored = window.localStorage.getItem(REMEMBERED_KEY_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as WrappedSyncKey;
  } catch {
    return null;
  }
}

export function clearWrappedKey(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(REMEMBERED_KEY_KEY);
  window.localStorage.removeItem(PASSKEY_ID_KEY);
}

export function storePasskeyId(id: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PASSKEY_ID_KEY, id);
}

export function loadPasskeyId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(PASSKEY_ID_KEY);
}
