import { authenticateRequest } from '../_lib/auth';
import { deleteAccountRows, deleteSnapshot } from '../_lib/supabase';
import { requireAppRequest, setNoStore } from '../_lib/security';

const ALLOWED_KEYS = new Set(['confirmText']);

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

  let body: Record<string, unknown>;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as Record<string, unknown>);
  } catch {
    res.status(400).json({ message: 'Invalid JSON body.' });
    return;
  }

  const keys = Object.keys(body);
  if (keys.some((key) => !ALLOWED_KEYS.has(key)) || body.confirmText !== 'DELETE') {
    res.status(400).json({ message: 'Typed confirmation is required.' });
    return;
  }

  await deleteSnapshot(auth.userId);
  await deleteAccountRows(auth.userId);
  res.status(200).json({ ok: true });
}
