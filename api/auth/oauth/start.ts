import { setNoStore } from '../../_lib/security';
import { stytchRequest } from '../../_lib/stytchClient';

const SUPPORTED_PROVIDERS = new Set(['google', 'apple']);

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
  req: { method?: string; headers: Record<string, string | string[] | undefined>; url?: string },
  res: { status: (code: number) => { json: (body: Record<string, unknown>) => void }; setHeader: (name: string, value: string) => void }
) {
  setNoStore(res);
  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method not allowed.' });
    return;
  }
  const url = new URL(req.url || '', 'http://localhost');
  const provider = url.searchParams.get('provider');
  if (!provider || !SUPPORTED_PROVIDERS.has(provider)) {
    res.status(400).json({ message: 'Unsupported provider.' });
    return;
  }

  const appUrl = getAppUrl(req);
  if (!appUrl) {
    res.status(400).json({ message: 'App URL is not configured.' });
    return;
  }

  const response = await stytchRequest<{ url: string }>(`/b2c/oauth/${provider}/start`, {
    login_redirect_url: `${appUrl}/auth`,
    signup_redirect_url: `${appUrl}/auth`,
  });

  res.setHeader('Location', response.url);
  res.status(302).json({ redirect: response.url });
}
