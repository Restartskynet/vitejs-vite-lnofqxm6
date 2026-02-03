type ClientEnv = {
  VITE_STYTCH_PUBLIC_TOKEN: string;
  VITE_APP_URL?: string;
  VITE_SYNC_KILL_SWITCH?: string;
};

const requiredClientVars = ['VITE_STYTCH_PUBLIC_TOKEN'] as const;

type RequiredClientVar = (typeof requiredClientVars)[number];

const getClientEnvValue = (key: RequiredClientVar): string => {
  const value = import.meta.env[key];
  const killSwitch = import.meta.env.VITE_SYNC_KILL_SWITCH === '1';
  if (killSwitch) {
    return value || '';
  }
  return value || '';
};

export const clientEnv: ClientEnv = {
  VITE_STYTCH_PUBLIC_TOKEN: getClientEnvValue('VITE_STYTCH_PUBLIC_TOKEN'),
  VITE_APP_URL: import.meta.env.VITE_APP_URL,
  VITE_SYNC_KILL_SWITCH: import.meta.env.VITE_SYNC_KILL_SWITCH,
};
