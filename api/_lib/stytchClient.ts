import { serverEnv } from './env';

const getBaseUrl = () => {
  const isTest = serverEnv.STYTCH_PROJECT_ID.startsWith('project-test') || serverEnv.STYTCH_SECRET.startsWith('test');
  return isTest ? 'https://test.stytch.com/v1' : 'https://api.stytch.com/v1';
};

const getAuthHeader = () => {
  const auth = Buffer.from(`${serverEnv.STYTCH_PROJECT_ID}:${serverEnv.STYTCH_SECRET}`).toString('base64');
  return `Basic ${auth}`;
};

export const stytchRequest = async <T>(path: string, body: Record<string, unknown>): Promise<T> => {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error_message || 'Stytch request failed.');
  }

  return (await response.json()) as T;
};
