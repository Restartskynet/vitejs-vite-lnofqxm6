import { authenticateRequest } from '../_lib/auth';
import { fetchSnapshot, upsertSnapshot } from '../_lib/supabase';
import { requireAppRequest, setNoStore } from '../_lib/security';
import { isRateLimited } from '../_lib/rateLimit';

const ALLOWED_KEYS = new Set([
  'deviceId',
  'updatedAt',
  'revision',
  'payloadVersion',
  'schemaVersion',
  'lastKnownRemoteRevision',
  'ciphertext',
]);

type PushBody = {
  deviceId: string;
  updatedAt: string;
  revision: number;
  payloadVersion: number;
  schemaVersion: number;
  lastKnownRemoteRevision: number;
  ciphertext: string;
};

const validateBody = (body: Record<string, unknown>): body is PushBody => {
  const keys = Object.keys(body);
  if (keys.some((key) => !ALLOWED_KEYS.has(key))) return false;
  return (
    typeof body.deviceId === 'string' &&
    typeof body.updatedAt === 'string' &&
    typeof body.revision === 'number' &&
    typeof body.payloadVersion === 'number' &&
    typeof body.schemaVersion === 'number' &&
    typeof body.lastKnownRemoteRevision === 'number' &&
    typeof body.ciphertext === 'string'
  );
};

export default async function handler(
  req: { method?: string; headers: Record<string, string | string[] | undefined>; body?: string },
  res: { status: (code: number) => { json: (body: Record<string, unknown>) => void }; setHeader: (name: string, value: string) => void }
) {
  setNoStore(res);
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed.' });
    return;
  }
  if (!requireAppRequest(req, res)) return;

  const auth = await authenticateRequest(req);
  if (!auth) {
    res.status(401).json({ message: 'Unauthorized.' });
    return;
  }

  if (isRateLimited(auth.userId)) {
    res.status(429).json({ message: 'Too many sync requests. Please slow down.' });
    return;
  }

  let body: Record<string, unknown>;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as Record<string, unknown>);
  } catch {
    res.status(400).json({ message: 'Invalid JSON body.' });
    return;
  }

  if (!validateBody(body)) {
    res.status(400).json({ message: 'Invalid sync payload.' });
    return;
  }

  const snapshot = await fetchSnapshot(auth.userId);
  if (snapshot && body.lastKnownRemoteRevision !== snapshot.rev) {
    res.status(409).json({ message: 'Revision conflict.' });
    return;
  }

  await upsertSnapshot({
    user_id: auth.userId,
    device_id: body.deviceId,
    rev: body.revision,
    ciphertext: body.ciphertext,
    updated_at: body.updatedAt,
  });

  res.status(200).json({ ok: true, revision: body.revision });
}
