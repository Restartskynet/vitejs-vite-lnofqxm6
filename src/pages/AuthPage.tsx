import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Page } from '../components/layout';
import { Button, Card, Input } from '../components/ui';
import { useAuth } from '../stores/authStore';
import { clientEnv } from '../lib/env';

export function AuthPage() {
  const { state, actions } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(state.lastEmail);
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'password' | 'magic'>('password');
  const [statusMessage, setStatusMessage] = useState('');
  const syncDisabled = clientEnv.VITE_SYNC_KILL_SWITCH === '1' || !clientEnv.VITE_STYTCH_PUBLIC_TOKEN;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const oauthToken = params.get('oauth_token');
    const token = params.get('token');
    if (oauthToken) {
      fetch('/api/auth/oauth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Request': '1',
        },
        body: JSON.stringify({ token: oauthToken }),
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error('Unable to verify OAuth sign-in.');
          }
          const payload = await response.json();
          actions.applySession(payload);
          navigate('/settings');
        })
        .catch(() => {
          setStatusMessage('Unable to verify OAuth sign-in. Please try again.');
        });
    } else if (token) {
      actions.completeMagicLink(token).then(() => {
        setStatusMessage('Magic link verified. You are signed in.');
        navigate('/settings');
      }).catch(() => {
        setStatusMessage('Unable to verify this magic link. Please request a new one.');
      });
    }
  }, [actions, location.search, navigate]);

  useEffect(() => {
    if (state.status === 'signed_in') {
      navigate('/settings');
    }
  }, [state.status, navigate]);

  const handlePasswordSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    await actions.signInWithPassword(email, password);
  };

  const handleMagicLink = async (event: React.FormEvent) => {
    event.preventDefault();
    await actions.requestMagicLink(email);
    setStatusMessage('Check your inbox for a magic link to continue.');
  };

  return (
    <Page title="Sign in" subtitle="Access Restart's Trading Co-Pilot on every device">
      {syncDisabled ? (
        <Card className="p-6">
          <p className="text-sm text-ink-muted">
            Authentication and cloud sync are currently disabled by environment configuration. Local-only mode
            remains fully available.
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Button
              size="sm"
              variant={mode === 'password' ? 'primary' : 'secondary'}
              onClick={() => setMode('password')}
            >
              Email + password
            </Button>
            <Button
              size="sm"
              variant={mode === 'magic' ? 'primary' : 'secondary'}
              onClick={() => setMode('magic')}
            >
              Magic link
            </Button>
          </div>

          {mode === 'password' ? (
            <form onSubmit={handlePasswordSignIn} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">Email</label>
                <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">Password</label>
                <Input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
              </div>
              <Button type="submit" className="w-full">Sign in</Button>
            </form>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">Email</label>
                <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
              </div>
              <Button type="submit" className="w-full">Send magic link</Button>
            </form>
          )}

          {state.error && <p className="mt-4 text-sm text-rose-400">{state.error}</p>}
          {statusMessage && <p className="mt-4 text-sm text-emerald-400">{statusMessage}</p>}
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">Passkeys and social sign-in</h3>
            <p className="text-sm text-slate-400">
              Use passkeys for the fastest sign-in, or continue with Google or Apple when supported by your device.
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                window.location.href = '/api/auth/oauth/start?provider=google';
              }}
            >
              Continue with Google
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                window.location.href = '/api/auth/oauth/start?provider=apple';
              }}
            >
              Continue with Apple
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                window.location.href = '/api/auth/passkey/start';
              }}
            >
              Continue with Passkey
            </Button>
            <p className="text-xs text-slate-500">
              Passkeys require FaceID/TouchID or platform authentication. If your browser does not support passkeys,
              you can always sign in with email.
            </p>
          </Card>
        </div>
      )}
    </Page>
  );
}
