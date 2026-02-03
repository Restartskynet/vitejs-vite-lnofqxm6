import { requireAppRequest, setNoStore } from '../_lib/security';
import { stytchRequest } from '../_lib/stytchClient';

const ALLOWED_KEYS = new Set(['email', 'password']);

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

  let body: Record<string, unknown>;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as Record<string, unknown>);
  } catch {
    res.status(400).json({ message: 'Invalid JSON body.' });
    return;
  }

  const keys = Object.keys(body);
  if (keys.some((key) => !ALLOWED_KEYS.has(key)) || typeof body.email !== 'string' || typeof body.password !== 'string') {
    res.status(400).json({ message: 'Email and password are required.' });
    return;
  }

  const response = await stytchRequest<{ session_token: string; user_id: string; user?: { email?: string | null } }>(
    '/b2c/passwords/authenticate',
    {
      email: body.email,
      password: body.password,
      session_duration_minutes: 1440,
    }
  );

  res.status(200).json({
    sessionToken: response.session_token,
    userId: response.user_id,
    email: response.user?.email ?? null,
  });
}
