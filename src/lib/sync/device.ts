const DEVICE_ID_KEY = 'restart-device-id';
const DEVICE_NAME_KEY = 'restart-device-name';

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server-device';
  const existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.localStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}

export function getDeviceName(): string {
  if (typeof window === 'undefined') return 'This device';
  const stored = window.localStorage.getItem(DEVICE_NAME_KEY);
  if (stored) return stored;
  const deviceId = getOrCreateDeviceId();
  const fallback = `Device ${deviceId.slice(0, 6).toUpperCase()}`;
  window.localStorage.setItem(DEVICE_NAME_KEY, fallback);
  return fallback;
}

export function setDeviceName(name: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DEVICE_NAME_KEY, name);
}
