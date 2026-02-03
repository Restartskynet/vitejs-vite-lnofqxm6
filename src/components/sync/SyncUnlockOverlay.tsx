import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useSync } from '../../stores/syncStore';
import { useAuth } from '../../stores/authStore';
import { Button, Card } from '../ui';

export function SyncUnlockOverlay() {
  const { state: syncState, actions: syncActions } = useSync();
  const { state: authState } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  if (!authState.session || !syncState.enabled || !syncState.rememberDevice || syncState.passphraseReady) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <Card className="max-w-md w-full mx-4 p-6 text-center space-y-4">
        <h2 className="text-xl font-semibold text-white">Unlock Restart's Trading Co-Pilot</h2>
        <p className="text-sm text-ink-muted">
          This device is remembered. Use a passkey to unlock synced data, or return to the sign-in screen.
        </p>
        <div className="flex flex-col gap-2">
          <Button
            onClick={async () => {
              try {
                await syncActions.unlockWithRememberedKey();
                setErrorMessage(null);
              } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : 'Unable to unlock with passkey.');
                navigate('/auth');
              }
            }}
          >
            Unlock with passkey
          </Button>
          <Link to="/auth">
            <Button variant="secondary" className="w-full">Go to sign in</Button>
          </Link>
        </div>
        {errorMessage && <p className="text-xs text-rose-400">{errorMessage}</p>}
      </Card>
    </div>
  );
}
