import { requireAppRequest, setNoStore } from '../_lib/security';
import { stytchRequest } from '../_lib/stytchClient';

const ALLOWED_KEYS = new Set(['email']);

const getAppUrl = (req: { headers: Record<string, string | string[] | undefined> }): string => {
  const configured = process.env.VITE_APP_URL;
  if (configured) return configured;
  const originHeader = req.headers.origin || req.headers.referer;
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;
  if (origin) return origin;
  const hostHeader = req.headers.host;
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  return host ? `https://${host}` : '';
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

  let body: Record<string, unknown>;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as Record<string, unknown>);
  } catch {
    res.status(400).json({ message: 'Invalid JSON body.' });
    return;
  }

  const keys = Object.keys(body);
  if (keys.some((key) => !ALLOWED_KEYS.has(key)) || typeof body.email !== 'string') {
    res.status(400).json({ message: 'Email is required.' });
    return;
  }

  const appUrl = getAppUrl(req);
  if (!appUrl) {
    res.status(400).json({ message: 'App URL is not configured.' });
    return;
  }

  await stytchRequest('/b2c/magic_links/email/login_or_create', {
    email: body.email,
    login_magic_link_url: `${appUrl}/auth`,
    signup_magic_link_url: `${appUrl}/auth`,
    session_duration_minutes: 1440,
  });

  res.status(200).json({ ok: true });
}
