import { authenticateRequest } from '../_lib/auth';
import { fetchSnapshot } from '../_lib/supabase';
import { requireAppRequest, setNoStore } from '../_lib/security';

export default async function handler(
  req: { method?: string; headers: Record<string, string | string[] | undefined> },
  res: { status: (code: number) => { json: (body: Record<string, unknown>) => void }; setHeader: (name: string, value: string) => void }
) {
  setNoStore(res);
  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method not allowed.' });
    return;
  }
  if (!requireAppRequest(req, res)) return;

  const auth = await authenticateRequest(req);
  if (!auth) {
    res.status(401).json({ message: 'Unauthorized.' });
    return;
  }

  const snapshot = await fetchSnapshot(auth.userId);
  if (!snapshot) {
    res.status(404).json({ message: 'No cloud snapshot found.' });
    return;
  }

  let envelope: {
    payloadVersion?: number;
    schemaVersion?: number;
    deviceId?: string;
    updatedAt?: string;
    revision?: number;
  };
  try {
    envelope = JSON.parse(snapshot.ciphertext) as typeof envelope;
  } catch {
    res.status(500).json({ message: 'Stored ciphertext is invalid.' });
    return;
  }

  res.status(200).json({
    revision: snapshot.rev,
    deviceId: envelope.deviceId || snapshot.device_id,
    updatedAt: envelope.updatedAt || snapshot.updated_at,
    payloadVersion: envelope.payloadVersion ?? 1,
    schemaVersion: envelope.schemaVersion ?? 1,
    ciphertext: snapshot.ciphertext,
  });
}
