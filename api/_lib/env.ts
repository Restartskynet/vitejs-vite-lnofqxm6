type ServerEnv = {
  STYTCH_PROJECT_ID: string;
  STYTCH_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY: string;
};

const requiredServerVars: Array<keyof ServerEnv> = [
  'STYTCH_PROJECT_ID',
  'STYTCH_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
];

const requireServerEnv = (key: keyof ServerEnv): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `[env] Missing ${key}. Set it in Vercel Project Settings → Environment Variables or .env.local for local dev.`
    );
  }
  return value;
};

const getServerEnv = (): ServerEnv => {
  for (const key of requiredServerVars) {
    requireServerEnv(key);
  }

  return {
    STYTCH_PROJECT_ID: requireServerEnv('STYTCH_PROJECT_ID'),
    STYTCH_SECRET: requireServerEnv('STYTCH_SECRET'),
    SUPABASE_URL: requireServerEnv('SUPABASE_URL'),
    SUPABASE_SERVICE_ROLE_KEY: requireServerEnv('SUPABASE_SERVICE_ROLE_KEY'),
    SUPABASE_ANON_KEY: requireServerEnv('SUPABASE_ANON_KEY'),
  };
};

export const serverEnv = getServerEnv();
