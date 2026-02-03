import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDashboard } from '../stores/dashboardStore';
import { useAuth } from '../stores/authStore';
import { useSync } from '../stores/syncStore';
import { Page } from '../components/layout';
import { Card, Button, CurrencyInput, Input, Badge, ConfirmModal } from '../components/ui';
import { clientEnv } from '../lib/env';
import { ImportHistory } from '../components/upload';
import { AdjustmentsTable } from '../components/adjustments';
import { StrategyModal } from '../components/strategy';
import { BackupRestore } from '../components/backup';
import { formatPercent, formatMoney } from '../lib/utils';
import type { PersistedFill, PersistedData, PersistedPendingOrder } from '../types';

export function SettingsPage() {
  const { state, actions } = useDashboard();
  const { state: authState, actions: authActions } = useAuth();
  const { state: syncState, actions: syncActions } = useSync();
  const { settings, adjustments, hasData, importHistory, schemaWarning, strategy, fills, pendingOrders } = state;
  const syncDisabled = clientEnv.VITE_SYNC_KILL_SWITCH === '1';

  const themeOptions = [
    {
      id: 'default',
      label: 'Harbor',
      description: 'Cool sapphire with balanced teal accents.',
      swatches: ['64 140 255', '62 190 168', '112 140 176'],
    },
    {
      id: 'ion',
      label: 'Citrine',
      description: 'Warm amber energy with copper highlights.',
      swatches: ['246 182 70', '255 140 84', '196 154 92'],
    },
    {
      id: 'ultraviolet',
      label: 'Verdant',
      description: 'Fresh evergreen tones with calm contrast.',
      swatches: ['88 196 140', '52 170 120', '92 150 130'],
    },
    {
      id: 'nocturne',
      label: 'Rouge',
      description: 'Bold red accents with refined depth.',
      swatches: ['248 114 114', '220 82 98', '170 112 126'],
    },
  ] as const;
  type ThemeId = typeof themeOptions[number]['id'];
  const getInitialTheme = (): ThemeId => {
    if (typeof window === 'undefined') return 'default';
    const saved = window.localStorage.getItem('restart-theme');
    if (saved && themeOptions.some((theme) => theme.id === saved)) {
      return saved as ThemeId;
    }
    return 'default';
  };
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>(getInitialTheme);
  const [isGridEnabled, setIsGridEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('restart-grid') === 'on';
  });
  
  const [showResetModal, setShowResetModal] = useState(false);
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [showSyncResetModal, setShowSyncResetModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [syncPassphrase, setSyncPassphrase] = useState('');
  const [rememberDevice, setRememberDevice] = useState(syncState.rememberDevice);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (selectedTheme === 'default') {
      window.localStorage.removeItem('restart-theme');
      document.documentElement.removeAttribute('data-theme');
    } else {
      window.localStorage.setItem('restart-theme', selectedTheme);
      document.documentElement.setAttribute('data-theme', selectedTheme);
    }
  }, [selectedTheme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isGridEnabled) {
      window.localStorage.setItem('restart-grid', 'on');
      document.documentElement.setAttribute('data-grid', 'on');
    } else {
      window.localStorage.setItem('restart-grid', 'off');
      document.documentElement.setAttribute('data-grid', 'off');
    }
  }, [isGridEnabled]);

  useEffect(() => {
    setRememberDevice(syncState.rememberDevice);
  }, [syncState.rememberDevice]);

  const handleStartingEquityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) actions.updateSettings({ startingEquity: value });
  };

  const handleStartingDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    actions.updateSettings({ startingDate: e.target.value });
  };

  const handleClearData = async () => {
    await actions.clearData();
    setShowResetModal(false);
  };

  const handleEnableSync = async () => {
    try {
      setSyncMessage(null);
      if (syncDisabled) {
        setSyncMessage('Cloud sync is disabled by environment configuration.');
        return;
      }
      if (!syncPassphrase) {
        setSyncMessage('Enter your sync passphrase to unlock cloud sync.');
        return;
      }
      await syncActions.unlockWithPassphrase(syncPassphrase, rememberDevice);
      syncActions.setEnabled(true);
      setSyncMessage('Cloud sync is unlocked for this session.');
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Unable to unlock sync.');
    }
  };

  const handleSyncNow = async () => {
    try {
      await syncActions.syncNow();
      setSyncMessage('Sync completed successfully.');
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Sync failed.');
    }
  };

  const handleDisconnect = () => {
    syncActions.disconnect();
    setSyncMessage('Cloud sync is disabled on this device.');
  };

  const handleResetSync = async () => {
    try {
      await syncActions.resetRemote();
      setShowSyncResetModal(false);
      setSyncMessage('Cloud sync data has been reset.');
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Unable to reset cloud sync.');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await syncActions.deleteAccount();
      authActions.signOut();
      setShowDeleteModal(false);
      setSyncMessage('Account deletion requested. Remote sync data has been removed.');
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Unable to delete account.');
    }
  };

  const formatTimestamp = (value: string | null) => {
    if (!value) return 'Not yet';
    return new Date(value).toLocaleString();
  };

  // Convert fills to persisted format for backup
  const persistedFills: PersistedFill[] = fills.map(f => ({
    id: f.id,
    fingerprint: f.id,
    symbol: f.symbol,
    side: f.side,
    quantity: f.quantity,
    price: f.price,
    filledTime: f.filledTime.toISOString(),
    orderId: f.orderId,
    commission: f.commission,
    marketDate: f.marketDate,
    rowIndex: f.rowIndex,
    stopPrice: f.stopPrice ?? null,
  }));

  const persistedPendingOrders: PersistedPendingOrder[] = pendingOrders.map((po) => ({
    symbol: po.symbol,
    side: po.side,
    price: po.price,
    stopPrice: po.stopPrice,
    limitPrice: po.limitPrice,
    quantity: po.quantity,
    placedTime: po.placedTime.toISOString(),
    type: po.type,
  }));

  const handleImportBackup = (data: PersistedData, mode: 'replace' | 'merge') => {
    actions.importBackup(data, mode);
  };

  return (
    <Page title="Settings" subtitle="Configure your account and local preferences">
      {/* Schema Warning Banner */}
      {schemaWarning && (
        <Card className="mb-6 border-amber-500/40">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-amber-400 mb-1">Schema Version Warning</h4>
              <p className="text-sm text-slate-400">{schemaWarning}</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Settings */}
        <Card>
          <h3 className="text-lg font-semibold text-white mb-4">Account Settings</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">
                Starting Equity
              </label>
              <CurrencyInput
                value={settings.startingEquity}
                onChange={handleStartingEquityChange}
                placeholder="25000"
              />
              <p className="mt-1.5 text-xs text-slate-500">
                Your account value before the first trade
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">
                Starting Date
              </label>
              <Input
                type="date"
                value={settings.startingDate}
                onChange={handleStartingDateChange}
              />
              <p className="mt-1.5 text-xs text-slate-500">
                Date to begin equity calculations
              </p>
            </div>
          </div>
        </Card>

        {/* Active Strategy */}
        <Card>
          <h3 className="text-lg font-semibold text-white mb-4">Active Strategy</h3>
          
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <Badge variant="info" size="sm">Current</Badge>
            </div>
            <p className="text-xl font-bold text-white">{strategy.name}</p>
            <p className="text-sm text-slate-400 mt-1">
              HIGH: {formatPercent(strategy.highModeRiskPct, 2)} • 
              LOW: {formatPercent(strategy.lowModeRiskPct, 2)} • 
              {strategy.winsToRecover} wins to recover
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-[10px] text-emerald-400/70 uppercase tracking-wider">HIGH Mode</p>
              <p className="text-lg font-bold text-emerald-400">{formatPercent(strategy.highModeRiskPct, 2)}</p>
              <p className="text-xs text-slate-500">{formatMoney(settings.startingEquity * strategy.highModeRiskPct)} risk</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-[10px] text-amber-400/70 uppercase tracking-wider">LOW Mode</p>
              <p className="text-lg font-bold text-amber-400">{formatPercent(strategy.lowModeRiskPct, 2)}</p>
              <p className="text-xs text-slate-500">{formatMoney(settings.startingEquity * strategy.lowModeRiskPct)} risk</p>
            </div>
          </div>

          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => setShowStrategyModal(true)}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            }
          >
            Edit Strategy
          </Button>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Customization</h3>
              <p className="text-xs text-ink-muted">Preset themes aligned to your trading mode.</p>
            </div>
            <Badge variant="info" size="sm">Theme</Badge>
          </div>
          <div className="space-y-3">
            {themeOptions.map((theme) => {
              const isActive = selectedTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setSelectedTheme(theme.id)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
                    isActive
                      ? 'border-[rgb(var(--accent-low)/0.6)] bg-[rgb(var(--accent-low)/0.12)]'
                      : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{theme.label}</p>
                      <p className="text-xs text-ink-muted">{theme.description}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {theme.swatches.map((swatch) => (
                        <span
                          key={swatch}
                          className="h-2.5 w-2.5 rounded-full border border-white/20"
                          style={{ backgroundColor: `rgb(${swatch})` }}
                        />
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Animated grid</p>
                <p className="text-xs text-ink-muted">Subtle motion layer behind the dashboard.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsGridEnabled((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
                  isGridEnabled
                    ? 'border-[rgb(var(--accent-low)/0.6)] bg-[rgb(var(--accent-low)/0.35)]'
                    : 'border-white/20 bg-white/10'
                }`}
                aria-pressed={isGridEnabled}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isGridEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </Card>

        {syncDisabled ? (
          <Card className="lg:col-span-2">
            <h3 className="text-lg font-semibold text-white mb-2">Account &amp; Cloud Sync</h3>
            <p className="text-sm text-ink-muted">
              Cloud sync and authentication are currently disabled by environment configuration. Local-only mode
              remains fully available.
            </p>
          </Card>
        ) : (
          <Card className="lg:col-span-2">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Account &amp; Cloud Sync</h3>
                <p className="text-xs text-ink-muted">
                  Optional encrypted sync for Restart's Trading Co-Pilot. Local-only mode stays available.
                </p>
              </div>
              {!authState.session ? (
                <Link to="/auth">
                  <Button size="sm">Sign in / Create account</Button>
                </Link>
              ) : (
                <Button size="sm" variant="secondary" onClick={authActions.signOut}>
                  Sign out
                </Button>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
                <p className="text-xs uppercase tracking-wider text-slate-500">Status</p>
                <p className="text-sm text-white">
                  {authState.session ? `Signed in as ${authState.session.email || 'Stytch user'}` : 'Signed out'}
                </p>
                <p className="text-xs text-ink-muted">Device: {syncState.deviceName}</p>
                <p className="text-xs text-ink-muted">Device ID: {syncState.deviceId}</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wider text-slate-500">Cloud sync</p>
                  <button
                    type="button"
                    onClick={() => syncActions.setEnabled(!syncState.enabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
                      syncState.enabled
                        ? 'border-[rgb(var(--accent-low)/0.6)] bg-[rgb(var(--accent-low)/0.35)]'
                        : 'border-white/20 bg-white/10'
                    }`}
                    aria-pressed={syncState.enabled}
                    disabled={!authState.session}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        syncState.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-ink-muted">
                  {authState.session
                    ? 'Encrypted sync stays on unless you disconnect.'
                    : 'Sign in to enable cloud sync.'}
                </p>
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Sync passphrase"
                    value={syncPassphrase}
                    onChange={(event) => setSyncPassphrase(event.target.value)}
                    disabled={!authState.session}
                  />
                  <p className="text-[11px] text-slate-500">
                    Please don't forget this. Without it, we can't recover your synced data.
                  </p>
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <input
                      type="checkbox"
                      checked={rememberDevice}
                      onChange={(event) => setRememberDevice(event.target.checked)}
                      disabled={!authState.session}
                    />
                    Remember this device (requires passkey unlock)
                  </label>
                  <Button size="sm" onClick={handleEnableSync} disabled={!authState.session}>
                    Unlock sync
                  </Button>
                  {syncState.rememberDevice && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        try {
                          await syncActions.unlockWithRememberedKey();
                          setSyncMessage('Passkey verified. Sync is unlocked.');
                        } catch (error) {
                          setSyncMessage(error instanceof Error ? error.message : 'Unable to unlock with passkey.');
                        }
                      }}
                    >
                      Unlock with passkey
                    </Button>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
                <p className="text-xs uppercase tracking-wider text-slate-500">Sync status</p>
                <p className="text-sm text-white">Last success: {formatTimestamp(syncState.lastSuccessAt)}</p>
                {syncState.lastError && <p className="text-xs text-rose-400">Last error: {syncState.lastError}</p>}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button size="sm" variant="secondary" onClick={handleSyncNow} disabled={!syncState.enabled}>
                    Sync now
                  </Button>
                  <Button size="sm" variant="secondary" onClick={handleDisconnect}>
                    Disconnect
                  </Button>
                </div>
              </div>
            </div>

            {syncMessage && <p className="mt-4 text-sm text-emerald-400">{syncMessage}</p>}

            {syncState.conflictKeys.length > 0 && (
              <div className="mt-5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
                <p className="text-sm text-amber-200 font-semibold mb-2">Sync conflict detected</p>
                <p className="text-xs text-amber-100/80 mb-3">
                  Both devices updated the same settings. Choose how to resolve the conflict.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      syncActions.clearConflict();
                      await handleSyncNow();
                    }}
                  >
                    Keep local
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      syncActions.clearConflict();
                      await syncActions.pullLatest();
                    }}
                  >
                    Keep remote
                  </Button>
                  <Button size="sm" variant="secondary" disabled>
                    Merge
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <p className="text-sm font-semibold text-white mb-1">Reset cloud sync data</p>
                <p className="text-xs text-ink-muted mb-3">
                  If you forget your sync passphrase and have no remembered device, reset the encrypted cloud snapshot.
                </p>
                <Button size="sm" variant="danger" onClick={() => setShowSyncResetModal(true)} disabled={!authState.session}>
                  Reset cloud sync
                </Button>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <p className="text-sm font-semibold text-white mb-1">Delete account</p>
                <p className="text-xs text-ink-muted mb-3">
                  This deletes your cloud snapshot immediately. Local data remains unless you reset it manually.
                </p>
                <Button size="sm" variant="danger" onClick={() => setShowDeleteModal(true)} disabled={!authState.session}>
                  Delete account
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Manual Adjustments */}
        <div className="lg:col-span-2">
          <AdjustmentsTable
            adjustments={adjustments}
            onAdd={actions.addAdjustment}
            onUpdate={actions.updateAdjustment}
            onDelete={actions.deleteAdjustment}
          />
        </div>

        {/* Import History */}
        <div className="lg:col-span-2">
          <ImportHistory 
            history={importHistory}
            onClearHistory={actions.clearImportHistory}
          />
        </div>

        {/* Data Management */}
        <Card className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-2">Data Management</h3>
          <p className="text-sm text-slate-400 mb-4">
            Your data is stored locally in your browser using IndexedDB. It never leaves your device.
          </p>
          
          {/* Storage Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Fills</p>
              <p className="text-lg font-bold text-white">{state.fills.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Trades</p>
              <p className="text-lg font-bold text-white">{state.trades.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Imports</p>
              <p className="text-lg font-bold text-white">{importHistory.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Adjustments</p>
              <p className="text-lg font-bold text-white">{adjustments.length}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <BackupRestore
              fills={persistedFills}
              settings={settings}
              importHistory={importHistory}
              adjustments={adjustments}
              pendingOrders={persistedPendingOrders}
              onImport={handleImportBackup}
            />
            <Button 
              variant="danger" 
              size="sm" 
              onClick={() => setShowResetModal(true)} 
              disabled={!hasData && importHistory.length === 0}
            >
              Reset Local Data
            </Button>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-2">Legal &amp; About</h3>
          <p className="text-sm text-slate-400">
            Restart's Trading Co-Pilot helps you stick to a deterministic risk plan using your own CSV imports. All processing is local-only.
          </p>
          <p className="text-xs text-ink-muted mt-2">
            Results vary. Process required. This tool does not provide financial advice.
          </p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Link
              to="/legal"
              className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-ink-muted hover:text-white transition-colors"
            >
              Legal Disclaimer
            </Link>
            <Link
              to="/legal"
              className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-ink-muted hover:text-white transition-colors"
            >
              Privacy &amp; Data Storage
            </Link>
          </div>
        </Card>
      </div>

      {/* Strategy Modal */}
      <StrategyModal
        isOpen={showStrategyModal}
        onClose={() => setShowStrategyModal(false)}
        onSave={actions.updateStrategy}
        strategy={strategy}
      />

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleClearData}
        title="Reset All Local Data"
        message="This will permanently delete all your imported fills, trades, and import history. Your settings will be preserved. This action cannot be undone."
        confirmText="Reset"
        confirmVariant="danger"
      />

      <ConfirmModal
        isOpen={showSyncResetModal}
        onClose={() => setShowSyncResetModal(false)}
        onConfirm={handleResetSync}
        title="Reset Cloud Sync Data"
        message="This deletes the encrypted cloud snapshot immediately. Use this only if you have lost your sync passphrase and no remembered device can unlock your data."
        confirmText="Reset Cloud Sync"
        confirmVariant="danger"
      />

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message="Type DELETE to remove your cloud sync data and account-linked records. Local data will remain unless you reset it manually."
        confirmText="Delete Account"
        confirmVariant="danger"
        requireTypedConfirmation="DELETE"
      />
    </Page>
  );
}
