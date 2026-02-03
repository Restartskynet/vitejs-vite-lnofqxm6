/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface AuthSession {
  userId: string;
  email: string | null;
  sessionToken: string;
}

interface AuthState {
  session: AuthSession | null;
  status: 'signed_out' | 'signed_in' | 'loading';
  error: string | null;
  lastEmail: string;
}

interface AuthContextValue {
  state: AuthState;
  actions: {
    signInWithPassword: (email: string, password: string) => Promise<void>;
    requestMagicLink: (email: string) => Promise<void>;
    completeMagicLink: (token: string) => Promise<void>;
    applySession: (session: AuthSession) => void;
    signOut: () => void;
    setLastEmail: (email: string) => void;
  };
}

const LAST_EMAIL_KEY = 'restart-last-email';

const AuthContext = createContext<AuthContextValue | null>(null);

const getStoredEmail = (): string => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(LAST_EMAIL_KEY) || '';
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    status: 'signed_out',
    error: null,
    lastEmail: getStoredEmail(),
  });

  const setLastEmail = useCallback((email: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LAST_EMAIL_KEY, email);
    }
    setState((prev) => ({ ...prev, lastEmail: email }));
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, status: 'loading', error: null }));
    try {
      const response = await fetch('/api/auth/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Request': '1',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unable to sign in.' }));
        setState((prev) => ({ ...prev, status: 'signed_out', error: error.message || 'Unable to sign in.' }));
        return;
      }

      const payload = (await response.json()) as { userId: string; sessionToken: string; email: string | null };
      setState({ session: payload, status: 'signed_in', error: null, lastEmail: email });
      setLastEmail(email);
    } catch (error) {
      setState((prev) => ({ ...prev, status: 'signed_out', error: 'Unable to sign in.' }));
    }
  }, [setLastEmail]);

  const requestMagicLink = useCallback(async (email: string) => {
    setState((prev) => ({ ...prev, status: 'loading', error: null }));
    try {
      const response = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Request': '1',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unable to send magic link.' }));
        setState((prev) => ({ ...prev, status: 'signed_out', error: error.message || 'Unable to send magic link.' }));
        return;
      }

      setState((prev) => ({ ...prev, status: 'signed_out', error: null }));
      setLastEmail(email);
    } catch (error) {
      setState((prev) => ({ ...prev, status: 'signed_out', error: 'Unable to send magic link.' }));
    }
  }, [setLastEmail]);

  const completeMagicLink = useCallback(async (token: string) => {
    setState((prev) => ({ ...prev, status: 'loading', error: null }));
    try {
      const response = await fetch('/api/auth/magic-link/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Request': '1',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unable to verify magic link.' }));
        setState((prev) => ({ ...prev, status: 'signed_out', error: error.message || 'Unable to verify magic link.' }));
        return;
      }

      const payload = (await response.json()) as { userId: string; sessionToken: string; email: string | null };
      setState((prev) => ({ ...prev, session: payload, status: 'signed_in', error: null }));
      if (payload.email) {
        setLastEmail(payload.email);
      }
    } catch (error) {
      setState((prev) => ({ ...prev, status: 'signed_out', error: 'Unable to verify magic link.' }));
    }
  }, [setLastEmail]);

  const signOut = useCallback(() => {
    setState((prev) => ({ ...prev, session: null, status: 'signed_out', error: null }));
  }, []);

  const applySession = useCallback((session: AuthSession) => {
    setState((prev) => ({ ...prev, session, status: 'signed_in', error: null }));
    if (session.email) {
      setLastEmail(session.email);
    }
  }, [setLastEmail]);

  const value = useMemo<AuthContextValue>(() => ({
    state,
    actions: {
      signInWithPassword,
      requestMagicLink,
      completeMagicLink,
      applySession,
      signOut,
      setLastEmail,
    },
  }), [state, signInWithPassword, requestMagicLink, completeMagicLink, applySession, signOut, setLastEmail]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
