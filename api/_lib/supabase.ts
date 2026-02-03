import { serverEnv } from './env';

const baseUrl = `${serverEnv.SUPABASE_URL}/rest/v1`;
const defaultHeaders = {
  apikey: serverEnv.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${serverEnv.SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
};

export interface CloudSnapshotRow {
  user_id: string;
  device_id: string;
  rev: number;
  ciphertext: string;
  updated_at: string;
}

export const fetchSnapshot = async (userId: string): Promise<CloudSnapshotRow | null> => {
  const response = await fetch(`${baseUrl}/cloud_snapshots?user_id=eq.${encodeURIComponent(userId)}&select=*`, {
    headers: {
      ...defaultHeaders,
      Prefer: 'count=exact',
    },
  });

  if (!response.ok) {
    throw new Error('Unable to fetch cloud snapshot.');
  }

  const rows = (await response.json()) as CloudSnapshotRow[];
  return rows[0] ?? null;
};

export const upsertSnapshot = async (row: CloudSnapshotRow): Promise<void> => {
  const response = await fetch(`${baseUrl}/cloud_snapshots`, {
    method: 'POST',
    headers: {
      ...defaultHeaders,
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(row),
  });

  if (!response.ok) {
    throw new Error('Unable to write cloud snapshot.');
  }
};

export const deleteSnapshot = async (userId: string): Promise<void> => {
  const response = await fetch(`${baseUrl}/cloud_snapshots?user_id=eq.${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: {
      ...defaultHeaders,
      Prefer: 'return=minimal',
    },
  });

  if (!response.ok) {
    throw new Error('Unable to delete cloud snapshot.');
  }
};

export const deleteAccountRows = async (userId: string): Promise<void> => {
  const response = await fetch(`${baseUrl}/entitlements?user_id=eq.${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: {
      ...defaultHeaders,
      Prefer: 'return=minimal',
    },
  });

  if (!response.ok) {
    throw new Error('Unable to delete account rows.');
  }
};
