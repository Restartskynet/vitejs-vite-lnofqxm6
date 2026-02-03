/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { clientEnv } from '../lib/env';
import { useDashboard } from './dashboardStore';
import { CURRENT_SCHEMA_VERSION } from '../types';
import { generateFillFingerprint } from '../lib/hash';
import { useAuth } from './authStore';
import { getDeviceName, getOrCreateDeviceId } from '../lib/sync/device';
import { decryptSyncEnvelope, decryptSyncEnvelopeWithKey, deriveSyncKey, encryptSyncPayload, encryptSyncPayloadWithKey } from '../lib/sync/crypto';
import { SYNC_PAYLOAD_VERSION } from '../lib/sync/types';
import type { SyncPayload, SyncSnapshot } from '../lib/sync/types';
import { mergeSyncData } from '../lib/sync/merge';
import { clearWrappedKey, loadPasskeyId, loadWrappedKey, storePasskeyId, storeWrappedKey, unwrapKeyForDevice, wrapKeyForDevice } from '../lib/sync/keyStorage';

const SYNC_STATE_KEY = 'restart-sync-state';

interface StoredSyncState {
  enabled: boolean;
  rememberDevice: boolean;
  lastSuccessAt: string | null;
  lastError: string | null;
  lastKnownRevision: number;
  kdf?: { salt: string; iterations: number };
}

interface SyncState {
  enabled: boolean;
  rememberDevice: boolean;
  status: 'idle' | 'syncing' | 'error';
  lastSuccessAt: string | null;
  lastError: string | null;
  deviceId: string;
  deviceName: string;
  lastKnownRevision: number;
  passphraseReady: boolean;
  conflictKeys: string[];
}

interface SyncContextValue {
  state: SyncState;
  actions: {
    setEnabled: (enabled: boolean) => void;
    unlockWithPassphrase: (passphrase: string, remember: boolean) => Promise<void>;
    unlockWithRememberedKey: () => Promise<void>;
    syncNow: () => Promise<void>;
    pullLatest: () => Promise<void>;
    disconnect: () => void;
    resetRemote: () => Promise<void>;
    deleteAccount: () => Promise<void>;
    clearConflict: () => void;
  };
}

const SyncContext = createContext<SyncContextValue | null>(null);

const loadStoredState = (): StoredSyncState => {
  if (typeof window === 'undefined') {
    return { enabled: false, rememberDevice: false, lastSuccessAt: null, lastError: null, lastKnownRevision: 0 };
  }
  const stored = window.localStorage.getItem(SYNC_STATE_KEY);
  if (!stored) {
    return { enabled: false, rememberDevice: false, lastSuccessAt: null, lastError: null, lastKnownRevision: 0 };
  }
  try {
    return JSON.parse(stored) as StoredSyncState;
  } catch {
    return { enabled: false, rememberDevice: false, lastSuccessAt: null, lastError: null, lastKnownRevision: 0 };
  }
};

const persistState = (state: StoredSyncState) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(state));
};

const SYNC_DISABLED = clientEnv.VITE_SYNC_KILL_SWITCH === '1' || !clientEnv.VITE_STYTCH_PUBLIC_TOKEN;
const encodeSalt = (salt: Uint8Array): string => btoa(String.fromCharCode(...salt));

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { state: dashboardState, actions: dashboardActions } = useDashboard();
  const { state: authState } = useAuth();
  const stored = loadStoredState();
  const [syncState, setSyncState] = useState<SyncState>({
    enabled: stored.enabled && !SYNC_DISABLED,
    rememberDevice: stored.rememberDevice,
    status: 'idle',
    lastSuccessAt: stored.lastSuccessAt,
    lastError: stored.lastError,
    deviceId: getOrCreateDeviceId(),
    deviceName: getDeviceName(),
    lastKnownRevision: stored.lastKnownRevision ?? 0,
    passphraseReady: false,
    conflictKeys: [],
  });
  const passphraseRef = useRef<string | null>(null);
  const keyRef = useRef<CryptoKey | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const existing = loadStoredState();
    persistState({
      enabled: syncState.enabled,
      rememberDevice: syncState.rememberDevice,
      lastSuccessAt: syncState.lastSuccessAt,
      lastError: syncState.lastError,
      lastKnownRevision: syncState.lastKnownRevision,
      kdf: existing.kdf,
    });
  }, [syncState.enabled, syncState.rememberDevice, syncState.lastSuccessAt, syncState.lastError, syncState.lastKnownRevision]);

  const performUserPresenceCheck = useCallback(async () => {
    if (!('credentials' in navigator)) {
      throw new Error('Passkeys are not available on this device.');
    }
    const passkeyId = loadPasskeyId();
    if (!passkeyId) {
      throw new Error('Passkey setup is required to unlock this device.');
    }
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    await navigator.credentials.get({
      publicKey: {
        challenge,
        userVerification: 'required',
        allowCredentials: [
          {
            id: Uint8Array.from(atob(passkeyId), (c) => c.charCodeAt(0)),
            type: 'public-key',
          },
        ],
      },
    });
  }, []);

  const ensurePasskeyRegistration = useCallback(async () => {
    if (!('credentials' in navigator)) {
      return null;
    }
    if (loadPasskeyId()) {
      return loadPasskeyId();
    }
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "Restart's Trading Co-Pilot" },
        user: {
          id: userId,
          name: authState.session?.email || 'restart-user',
          displayName: authState.session?.email || 'Restart user',
        },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        authenticatorSelection: {
          residentKey: 'required',
          userVerification: 'required',
        },
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (!credential) return null;
    const rawId = credential.rawId;
    const id = btoa(String.fromCharCode(...new Uint8Array(rawId)));
    storePasskeyId(id);
    return id;
  }, [authState.session?.email]);

  const unlockWithPassphrase = useCallback(async (passphrase: string, remember: boolean) => {
    passphraseRef.current = passphrase;
    const { key, salt, iterations } = await deriveSyncKey(passphrase, { extractable: remember });
    keyRef.current = key;
    setSyncState((prev) => ({ ...prev, passphraseReady: true, rememberDevice: remember }));

    if (remember) {
      const passkeyId = await ensurePasskeyRegistration();
      if (!passkeyId) {
        throw new Error('Passkeys are not available on this device. Enter your passphrase each session instead.');
      }
      const wrapped = await wrapKeyForDevice(key);
      storeWrappedKey(wrapped);
      persistState({
        ...loadStoredState(),
        rememberDevice: true,
        kdf: { salt: encodeSalt(salt), iterations },
      });
    } else {
      clearWrappedKey();
      persistState({
        ...loadStoredState(),
        rememberDevice: false,
        kdf: undefined,
      });
    }
  }, [ensurePasskeyRegistration]);

  const unlockWithRememberedKey = useCallback(async () => {
    const storedKey = loadWrappedKey();
    const storedSync = loadStoredState();
    if (!storedKey || !storedSync.kdf) {
      throw new Error('No remembered device key found.');
    }
    await performUserPresenceCheck();
    const key = await unwrapKeyForDevice(storedKey);
    keyRef.current = key;
    setSyncState((prev) => ({ ...prev, passphraseReady: true }));
  }, [performUserPresenceCheck]);

  const setEnabled = useCallback((enabled: boolean) => {
    setSyncState((prev) => ({ ...prev, enabled: enabled && !SYNC_DISABLED }));
    persistState({ ...loadStoredState(), enabled: enabled && !SYNC_DISABLED });
  }, []);

  const clearConflict = useCallback(() => {
    setSyncState((prev) => ({ ...prev, conflictKeys: [] }));
  }, []);

  const pullLatest = useCallback(async () => {
    if (SYNC_DISABLED || !authState.session || !syncState.enabled) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('You are offline. Connect to the internet to sync.');
    }
    if (!keyRef.current && !passphraseRef.current) {
      throw new Error('Unlock your sync passphrase to continue.');
    }
    const response = await fetch('/api/sync/pull', {
      headers: {
        'X-App-Request': '1',
        Authorization: `Bearer ${authState.session.sessionToken}`,
      },
    });
    if (response.status === 404) {
      return;
    }
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unable to pull sync data.' }));
      throw new Error(error.message || 'Unable to pull sync data.');
    }
    const snapshot = (await response.json()) as SyncSnapshot;
    const storedState = loadStoredState();
    const useRememberedKey = Boolean(keyRef.current && storedState.kdf);
    const remotePayload = useRememberedKey
      ? await decryptSyncEnvelopeWithKey(snapshot.ciphertext, keyRef.current as CryptoKey)
      : await decryptSyncEnvelope(snapshot.ciphertext, passphraseRef.current || '');
    const mergeResult = mergeSyncData(
      {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        fills: dashboardState.fills.map((fill) => ({
          id: fill.id,
          fingerprint: generateFillFingerprint(fill.symbol, fill.side, fill.quantity, fill.price, fill.filledTime),
          symbol: fill.symbol,
          side: fill.side,
          quantity: fill.quantity,
          price: fill.price,
          filledTime: fill.filledTime.toISOString(),
          orderId: fill.orderId,
          commission: fill.commission,
          marketDate: fill.marketDate,
          rowIndex: fill.rowIndex,
          stopPrice: fill.stopPrice ?? null,
        })),
        fillFingerprints: Array.from(dashboardState.fillFingerprints),
        settings: dashboardState.settings,
        importHistory: dashboardState.importHistory,
        adjustments: dashboardState.adjustments,
        pendingOrders: dashboardState.pendingOrders.map((po) => ({
          symbol: po.symbol,
          side: po.side,
          price: po.price,
          stopPrice: po.stopPrice,
          limitPrice: po.limitPrice,
          quantity: po.quantity,
          placedTime: po.placedTime.toISOString(),
          type: po.type,
        })),
        strategy: dashboardState.strategy,
      },
      remotePayload.data,
      new Date().toISOString(),
      remotePayload.updatedAt
    );

    if (mergeResult.conflicts.length > 0) {
      setSyncState((prev) => ({ ...prev, conflictKeys: mergeResult.conflicts }));
      return;
    }
    await dashboardActions.importBackup(mergeResult.merged, 'replace');
    setSyncState((prev) => ({
      ...prev,
      lastKnownRevision: snapshot.revision,
      lastSuccessAt: snapshot.updatedAt,
    }));
  }, [authState.session, dashboardActions, dashboardState, syncState.enabled]);

  const syncNow = useCallback(async () => {
    if (SYNC_DISABLED) return;
    if (!authState.session) {
      throw new Error('You must be signed in to sync.');
    }
    if (!syncState.enabled) {
      throw new Error('Cloud sync is disabled.');
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('You are offline. Connect to the internet to sync.');
    }
    if (!keyRef.current && !passphraseRef.current) {
      throw new Error('Unlock your sync passphrase to continue.');
    }

    setSyncState((prev) => ({ ...prev, status: 'syncing', lastError: null }));
    const payload: SyncPayload = {
      payloadVersion: SYNC_PAYLOAD_VERSION,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      deviceId: syncState.deviceId,
      updatedAt: new Date().toISOString(),
      revision: syncState.lastKnownRevision + 1,
      data: {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        fills: dashboardState.fills.map((fill) => ({
          id: fill.id,
          fingerprint: generateFillFingerprint(fill.symbol, fill.side, fill.quantity, fill.price, fill.filledTime),
          symbol: fill.symbol,
          side: fill.side,
          quantity: fill.quantity,
          price: fill.price,
          filledTime: fill.filledTime.toISOString(),
          orderId: fill.orderId,
          commission: fill.commission,
          marketDate: fill.marketDate,
          rowIndex: fill.rowIndex,
          stopPrice: fill.stopPrice ?? null,
        })),
        fillFingerprints: Array.from(dashboardState.fillFingerprints),
        settings: dashboardState.settings,
        importHistory: dashboardState.importHistory,
        adjustments: dashboardState.adjustments,
        pendingOrders: dashboardState.pendingOrders.map((po) => ({
          symbol: po.symbol,
          side: po.side,
          price: po.price,
          stopPrice: po.stopPrice,
          limitPrice: po.limitPrice,
          quantity: po.quantity,
          placedTime: po.placedTime.toISOString(),
          type: po.type,
        })),
        strategy: dashboardState.strategy,
      },
    };

    const storedState = loadStoredState();
    const useRememberedKey = Boolean(keyRef.current && storedState.kdf);
    const ciphertext = useRememberedKey
      ? await encryptSyncPayloadWithKey(payload, keyRef.current as CryptoKey, {
          salt: Uint8Array.from(atob(storedState.kdf?.salt || ''), (c) => c.charCodeAt(0)),
          iterations: storedState.kdf?.iterations || 310000,
        })
      : await encryptSyncPayload(payload, passphraseRef.current || '');

    const response = await fetch('/api/sync/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Request': '1',
        Authorization: `Bearer ${authState.session.sessionToken}`,
      },
      body: JSON.stringify({
        deviceId: payload.deviceId,
        updatedAt: payload.updatedAt,
        revision: payload.revision,
        payloadVersion: payload.payloadVersion,
        schemaVersion: payload.schemaVersion,
        lastKnownRemoteRevision: syncState.lastKnownRevision,
        ciphertext,
      }),
    });

    if (response.status === 409) {
      const pullResponse = await fetch('/api/sync/pull', {
        headers: {
          'X-App-Request': '1',
          Authorization: `Bearer ${authState.session.sessionToken}`,
        },
      });
      if (!pullResponse.ok) {
        const error = await pullResponse.json().catch(() => ({ message: 'Unable to pull sync data.' }));
        setSyncState((prev) => ({ ...prev, status: 'error', lastError: error.message || 'Unable to pull sync data.' }));
        return;
      }
      const snapshot = (await pullResponse.json()) as SyncSnapshot;
      const storedAfterConflict = loadStoredState();
      const useRememberedKeyAfterConflict = Boolean(keyRef.current && storedAfterConflict.kdf);
      const remotePayload = useRememberedKeyAfterConflict
        ? await decryptSyncEnvelopeWithKey(snapshot.ciphertext, keyRef.current as CryptoKey)
        : await decryptSyncEnvelope(snapshot.ciphertext, passphraseRef.current || '');
      const mergeResult = mergeSyncData(payload.data, remotePayload.data, payload.updatedAt, remotePayload.updatedAt);
      if (mergeResult.conflicts.length > 0) {
        setSyncState((prev) => ({ ...prev, conflictKeys: mergeResult.conflicts, status: 'idle' }));
        return;
      }
      await dashboardActions.importBackup(mergeResult.merged, 'replace');
      setSyncState((prev) => ({
        ...prev,
        status: 'idle',
        lastKnownRevision: snapshot.revision,
        lastSuccessAt: snapshot.updatedAt,
      }));
      return;
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Sync failed.' }));
      setSyncState((prev) => ({ ...prev, status: 'error', lastError: error.message || 'Sync failed.' }));
      return;
    }

    setSyncState((prev) => ({
      ...prev,
      status: 'idle',
      lastSuccessAt: payload.updatedAt,
      lastKnownRevision: payload.revision,
      lastError: null,
    }));
    retryCountRef.current = 0;
    if (retryTimeoutRef.current) {
      window.clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, [authState.session, dashboardActions, dashboardState, syncState.enabled, syncState.lastKnownRevision, syncState.deviceId]);

  useEffect(() => {
    if (!authState.session || !syncState.enabled || !syncState.passphraseReady) return;
    pullLatest().catch((error) => {
      setSyncState((prev) => ({ ...prev, status: 'error', lastError: error.message || 'Unable to pull sync data.' }));
    });
  }, [authState.session, syncState.enabled, syncState.passphraseReady, pullLatest]);

  useEffect(() => {
    if (authState.session) return;
    passphraseRef.current = null;
    keyRef.current = null;
    setSyncState((prev) => ({ ...prev, enabled: false, passphraseReady: false }));
  }, [authState.session]);

  useEffect(() => {
    if (!authState.session || !syncState.enabled || !syncState.passphraseReady) return;
    const scheduleRetry = () => {
      retryCountRef.current += 1;
      const backoffMs = Math.min(30000, 2000 * 2 ** (retryCountRef.current - 1));
      retryTimeoutRef.current = window.setTimeout(() => {
        syncNow().catch((error) => {
          setSyncState((prev) => ({ ...prev, status: 'error', lastError: error.message || 'Sync failed.' }));
          scheduleRetry();
        });
      }, backoffMs);
    };

    const timeout = window.setTimeout(() => {
      syncNow().catch((error) => {
        setSyncState((prev) => ({ ...prev, status: 'error', lastError: error.message || 'Sync failed.' }));
        scheduleRetry();
      });
    }, 1500);
    return () => {
      clearTimeout(timeout);
      if (retryTimeoutRef.current) {
        window.clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [
    authState.session,
    syncState.enabled,
    syncState.passphraseReady,
    dashboardState.fills,
    dashboardState.importHistory,
    dashboardState.adjustments,
    dashboardState.pendingOrders,
    dashboardState.settings,
    dashboardState.strategy,
    syncNow,
  ]);

  const disconnect = useCallback(() => {
    setSyncState((prev) => ({ ...prev, enabled: false, status: 'idle', lastError: null, passphraseReady: false }));
    passphraseRef.current = null;
    keyRef.current = null;
  }, []);

  const resetRemote = useCallback(async () => {
    if (!authState.session) throw new Error('You must be signed in.');
    const response = await fetch('/api/sync/reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Request': '1',
        Authorization: `Bearer ${authState.session.sessionToken}`,
      },
      body: JSON.stringify({ confirm: true }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unable to reset cloud sync.' }));
      throw new Error(error.message || 'Unable to reset cloud sync.');
    }
    setSyncState((prev) => ({ ...prev, lastKnownRevision: 0, lastSuccessAt: null }));
  }, [authState.session]);

  const deleteAccount = useCallback(async () => {
    if (!authState.session) throw new Error('You must be signed in.');
    const response = await fetch('/api/account/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Request': '1',
        Authorization: `Bearer ${authState.session.sessionToken}`,
      },
      body: JSON.stringify({ confirmText: 'DELETE' }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unable to delete account.' }));
      throw new Error(error.message || 'Unable to delete account.');
    }
    clearWrappedKey();
    setSyncState((prev) => ({ ...prev, enabled: false, lastKnownRevision: 0, passphraseReady: false }));
    passphraseRef.current = null;
    keyRef.current = null;
  }, [authState.session]);

  const value = useMemo<SyncContextValue>(() => ({
    state: syncState,
    actions: {
      setEnabled,
      unlockWithPassphrase,
      unlockWithRememberedKey,
      syncNow,
      pullLatest,
      disconnect,
      resetRemote,
      deleteAccount,
      clearConflict,
    },
  }), [syncState, setEnabled, unlockWithPassphrase, unlockWithRememberedKey, syncNow, pullLatest, disconnect, resetRemote, deleteAccount, clearConflict]);

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
