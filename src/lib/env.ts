type ClientEnv = {
  VITE_STYTCH_PUBLIC_TOKEN: string;
  VITE_APP_URL?: string;
};

const requiredClientVars = ['VITE_STYTCH_PUBLIC_TOKEN'] as const;

type RequiredClientVar = (typeof requiredClientVars)[number];

const getClientEnvValue = (key: RequiredClientVar): string => {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(
      `[env] Missing ${key}. Set it in .env.local or Vercel Project Settings → Environment Variables.`
    );
  }
  return value;
};

export const clientEnv: ClientEnv = {
  VITE_STYTCH_PUBLIC_TOKEN: getClientEnvValue('VITE_STYTCH_PUBLIC_TOKEN'),
  VITE_APP_URL: import.meta.env.VITE_APP_URL,
};
