import { serverEnv } from './env';

export interface AuthResult {
  userId: string;
  email: string | null;
}

type ReqLike = {
  headers: Record<string, string | string[] | undefined>;
};

const getSessionToken = (req: ReqLike): string | null => {
  const authHeader = req.headers.authorization;
  const value = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!value) return null;
  if (!value.startsWith('Bearer ')) return null;
  return value.slice('Bearer '.length).trim();
};

const getStytchBaseUrl = () => {
  const isTest = serverEnv.STYTCH_PROJECT_ID.startsWith('project-test') || serverEnv.STYTCH_SECRET.startsWith('test');
  return isTest ? 'https://test.stytch.com/v1' : 'https://api.stytch.com/v1';
};

export const authenticateRequest = async (req: ReqLike): Promise<AuthResult | null> => {
  const sessionToken = getSessionToken(req);
  if (!sessionToken) return null;

  const baseUrl = getStytchBaseUrl();
  const auth = Buffer.from(`${serverEnv.STYTCH_PROJECT_ID}:${serverEnv.STYTCH_SECRET}`).toString('base64');

  const response = await fetch(`${baseUrl}/b2c/sessions/authenticate`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ session_token: sessionToken }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { session?: { user_id?: string }; user_id?: string; user?: { email?: string | null } };
  const userId = payload.session?.user_id || payload.user_id;
  if (!userId) {
    return null;
  }

  return { userId, email: payload.user?.email ?? null };
};
