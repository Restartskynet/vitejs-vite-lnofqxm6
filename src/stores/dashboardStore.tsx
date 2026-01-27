import React, { createContext, useContext, useReducer, useCallback, useEffect, useState, type ReactNode } from 'react';
import type { Fill, Trade, DailyEquity, ImportResult } from '../engine/types';
import type { Metrics, Settings, UploadStatus, CurrentRisk, ImportHistoryEntry, PersistedFill } from '../types';
import { DEFAULT_SETTINGS, EMPTY_METRICS, EMPTY_CURRENT_RISK, CURRENT_SCHEMA_VERSION } from '../types';
import { buildTrades, calculateMetrics } from '../engine/tradesBuilder';
import { getCurrentRisk, calculateDailyEquity, calculateMaxDrawdown, DEFAULT_STRATEGY } from '../engine/riskEngine';
import { loadPersistedData, savePersistedData, clearPersistedData, createEmptyPersistedData, isIndexedDBAvailable } from '../lib/db';
import { generateFillFingerprint } from '../lib/hash';

// ============================================================================
// STATE INTERFACE
// ============================================================================

interface Adjustment {
  id: string;
  date: string;
  type: 'Deposit' | 'Withdrawal' | 'Fee' | 'Correction';
  amount: number;
  note: string;
}

interface DashboardState {
  // Raw data
  fills: Fill[];
  fillFingerprints: Set<string>;
  importMetadata: {
    fileName: string;
    importedAt: Date;
    rowCount: number;
    fillCount: number;
    dateRange: { start: string; end: string } | null;
  } | null;

  // Import history
  importHistory: ImportHistoryEntry[];

  // Derived data
  trades: Trade[];
  dailyEquity: DailyEquity[];
  currentRisk: CurrentRisk;
  metrics: Metrics;

  // User config
  settings: Settings;
  adjustments: Adjustment[];

  // UI state
  uploadStatus: UploadStatus;
  uploadResult: ImportResult | null;
  isLoading: boolean;
  hasData: boolean;
  isHydrated: boolean;
  schemaWarning: string | null;
}

const initialState: DashboardState = {
  fills: [],
  fillFingerprints: new Set(),
  importMetadata: null,
  importHistory: [],
  trades: [],
  dailyEquity: [],
  currentRisk: EMPTY_CURRENT_RISK,
  metrics: EMPTY_METRICS,
  settings: DEFAULT_SETTINGS,
  adjustments: [],
  uploadStatus: 'idle',
  uploadResult: null,
  isLoading: true,
  hasData: false,
  isHydrated: false,
  schemaWarning: null,
};

// ============================================================================
// ACTIONS
// ============================================================================

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_UPLOAD_STATUS'; payload: UploadStatus }
  | { type: 'SET_UPLOAD_RESULT'; payload: ImportResult | null }
  | { type: 'IMPORT_FILLS'; payload: { fills: Fill[]; metadata: { fileName: string; rowCount: number; fillCount: number; dateRange: { start: string; end: string } | null }; mode: 'merge' | 'replace' } }
  | { type: 'ADD_IMPORT_HISTORY'; payload: ImportHistoryEntry }
  | { type: 'CLEAR_IMPORT_HISTORY' }
  | { type: 'PROCESS_DATA' }
  | { type: 'SET_SETTINGS'; payload: Partial<Settings> }
  | { type: 'ADD_ADJUSTMENT'; payload: Adjustment }
  | { type: 'UPDATE_ADJUSTMENT'; payload: Adjustment }
  | { type: 'DELETE_ADJUSTMENT'; payload: string }
  | { type: 'CLEAR_DATA' }
  | { type: 'HYDRATE'; payload: { fills: Fill[]; fingerprints: string[]; settings: Settings; importHistory: ImportHistoryEntry[]; adjustments: Adjustment[] } }
  | { type: 'SET_HYDRATED' }
  | { type: 'SET_SCHEMA_WARNING'; payload: string | null };

  function recomputeDerivedData(fills: Fill[], startingEquity: number) {
    // buildTrades returns { trades, riskTimeline } - MUST destructure!
    const buildResult = buildTrades(fills, startingEquity);
    
    // Extract the trades array from the result
    // Handle both object return { trades: [...] } and array return [...] for compatibility
    let tradesArray: Trade[];
    if (Array.isArray(buildResult)) {
      tradesArray = buildResult;
    } else if (buildResult && typeof buildResult === 'object' && 'trades' in buildResult) {
      tradesArray = buildResult.trades;
    } else {
      console.warn('buildTrades returned unexpected type:', typeof buildResult);
      tradesArray = [];
    }
    
    const metrics = calculateMetrics(tradesArray);
    const dailyEquity = calculateDailyEquity(tradesArray, startingEquity);
    metrics.maxDrawdownPct = calculateMaxDrawdown(dailyEquity);
    const riskState = getCurrentRisk(tradesArray, startingEquity, DEFAULT_STRATEGY);
    
    const currentRisk: CurrentRisk = {
      asOfDate: riskState.date,
      mode: riskState.mode,
      todayRiskPct: riskState.riskPct,
      allowedRiskDollars: riskState.allowedRiskDollars,
      equity: riskState.equity,
      lowWinsProgress: riskState.lowWinsProgress,
      lowWinsNeeded: riskState.lowWinsNeeded,
      forecast: riskState.forecast,
    };
  
    return { trades: tradesArray, metrics, dailyEquity, currentRisk };
  }

function dashboardReducer(state: DashboardState, action: Action): DashboardState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_UPLOAD_STATUS':
      return { ...state, uploadStatus: action.payload };

    case 'SET_UPLOAD_RESULT':
      return { ...state, uploadResult: action.payload };

    case 'IMPORT_FILLS': {
      const { fills: newFills, metadata, mode } = action.payload;
      
      let mergedFills: Fill[];
      let newFingerprints: Set<string>;
      let addedCount = 0;
      let skippedCount = 0;
      
      if (mode === 'replace') {
        // Replace mode: clear existing and use new
        mergedFills = [...newFills];
        newFingerprints = new Set<string>();
        newFills.forEach(fill => {
          const fp = (fill as Fill & { fingerprint?: string }).fingerprint || 
            generateFillFingerprint(fill.symbol, fill.side, fill.quantity, fill.price, fill.filledTime);
          newFingerprints.add(fp);
        });
        addedCount = newFills.length;
      } else {
        // Merge mode: dedupe based on fingerprints
        mergedFills = [...state.fills];
        newFingerprints = new Set(state.fillFingerprints);
        
        for (const fill of newFills) {
          const fp = (fill as Fill & { fingerprint?: string }).fingerprint || 
            generateFillFingerprint(fill.symbol, fill.side, fill.quantity, fill.price, fill.filledTime);
          
          if (!newFingerprints.has(fp)) {
            mergedFills.push(fill);
            newFingerprints.add(fp);
            addedCount++;
          } else {
            skippedCount++;
          }
        }
        
        // Sort by date
        mergedFills.sort((a, b) => a.filledTime.getTime() - b.filledTime.getTime());
      }
      
      // Recompute derived data
      const derived = recomputeDerivedData(mergedFills, state.settings.startingEquity);
      
      // Create import history entry
      const historyEntry: ImportHistoryEntry = {
        id: `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fileName: metadata.fileName,
        importedAt: new Date().toISOString(),
        mode,
        stats: {
          totalRows: metadata.rowCount,
          newFillsAdded: addedCount,
          duplicatesSkipped: skippedCount,
          errorsCount: 0,
          warningsCount: 0,
        },
        dateRange: metadata.dateRange,
        symbols: [...new Set(newFills.map(f => f.symbol))].sort(),
      };

      return {
        ...state,
        fills: mergedFills,
        fillFingerprints: newFingerprints,
        importMetadata: {
          fileName: metadata.fileName,
          importedAt: new Date(),
          rowCount: metadata.rowCount,
          fillCount: metadata.fillCount,
          dateRange: metadata.dateRange,
        },
        importHistory: [historyEntry, ...state.importHistory].slice(0, 50), // Keep last 50
        ...derived,
        hasData: mergedFills.length > 0,
        uploadStatus: 'success',
      };
    }

    case 'ADD_IMPORT_HISTORY':
      return {
        ...state,
        importHistory: [action.payload, ...state.importHistory].slice(0, 50),
      };

    case 'CLEAR_IMPORT_HISTORY':
      return {
        ...state,
        importHistory: [],
      };

    case 'PROCESS_DATA': {
      const derived = recomputeDerivedData(state.fills, state.settings.startingEquity);
      return { ...state, ...derived };
    }

    case 'SET_SETTINGS': {
      const newSettings = { ...state.settings, ...action.payload };
      
      if (action.payload.startingEquity && state.hasData) {
        const derived = recomputeDerivedData(state.fills, newSettings.startingEquity);
        return { ...state, settings: newSettings, ...derived };
      }
      
      return { ...state, settings: newSettings };
    }

    case 'ADD_ADJUSTMENT':
      return { ...state, adjustments: [...state.adjustments, action.payload] };

    case 'UPDATE_ADJUSTMENT':
      return {
        ...state,
        adjustments: state.adjustments.map((a) =>
          a.id === action.payload.id ? action.payload : a
        ),
      };

    case 'DELETE_ADJUSTMENT':
      return {
        ...state,
        adjustments: state.adjustments.filter((a) => a.id !== action.payload),
      };

    case 'CLEAR_DATA':
      return {
        ...initialState,
        settings: state.settings,
        isHydrated: true,
        isLoading: false,
      };

    case 'HYDRATE': {
      const { fills, fingerprints, settings, importHistory, adjustments } = action.payload;
      const derived = fills.length > 0 
        ? recomputeDerivedData(fills, settings.startingEquity)
        : { trades: [], metrics: EMPTY_METRICS, dailyEquity: [], currentRisk: EMPTY_CURRENT_RISK };
      
      return {
        ...state,
        fills,
        fillFingerprints: new Set(fingerprints),
        settings,
        importHistory,
        adjustments,
        ...derived,
        hasData: fills.length > 0,
        isHydrated: true,
        isLoading: false,
      };
    }

    case 'SET_HYDRATED':
      return { ...state, isHydrated: true, isLoading: false };

    case 'SET_SCHEMA_WARNING':
      return { ...state, schemaWarning: action.payload };

    default:
      return state;
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

interface DashboardContextValue {
  state: DashboardState;
  dispatch: React.Dispatch<Action>;
  actions: {
    setLoading: (isLoading: boolean) => void;
    setUploadStatus: (status: UploadStatus) => void;
    setUploadResult: (result: ImportResult | null) => void;
    importFills: (fills: Fill[], metadata: { fileName: string; rowCount: number; fillCount: number; dateRange: { start: string; end: string } | null }, mode?: 'merge' | 'replace') => void;
    clearImportHistory: () => void;
    processData: () => void;
    updateSettings: (settings: Partial<Settings>) => void;
    addAdjustment: (adjustment: Adjustment) => void;
    updateAdjustment: (adjustment: Adjustment) => void;
    deleteAdjustment: (id: string) => void;
    clearData: () => Promise<void>;
    dismissSchemaWarning: () => void;
  };
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);

  // Hydrate from IndexedDB on mount
  useEffect(() => {
    async function hydrate() {
      if (!isIndexedDBAvailable()) {
        console.warn('IndexedDB not available, using memory-only mode');
        dispatch({ type: 'SET_HYDRATED' });
        return;
      }

      try {
        const persisted = await loadPersistedData();
        
        if (persisted) {
          // Convert persisted fills back to Fill objects
          const fills: Fill[] = persisted.fills.map(pf => ({
            id: pf.id,
            symbol: pf.symbol,
            side: pf.side,
            quantity: pf.quantity,
            price: pf.price,
            filledTime: new Date(pf.filledTime),
            orderId: pf.orderId,
            commission: pf.commission,
            marketDate: pf.marketDate,
          }));

          dispatch({
            type: 'HYDRATE',
            payload: {
              fills,
              fingerprints: persisted.fillFingerprints,
              settings: persisted.settings,
              importHistory: persisted.importHistory,
              adjustments: persisted.adjustments,
            },
          });
        } else {
          dispatch({ type: 'SET_HYDRATED' });
        }
      } catch (error) {
        console.error('Failed to hydrate from IndexedDB:', error);
        dispatch({ type: 'SET_SCHEMA_WARNING', payload: 'Failed to load saved data. Starting fresh.' });
        dispatch({ type: 'SET_HYDRATED' });
      }
    }

    hydrate();
  }, []);

  // Persist to IndexedDB when state changes
  useEffect(() => {
    if (!state.isHydrated || !isIndexedDBAvailable()) return;

    async function persist() {
      try {
        const persistedFills: PersistedFill[] = state.fills.map(f => ({
          id: f.id,
          fingerprint: generateFillFingerprint(f.symbol, f.side, f.quantity, f.price, f.filledTime),
          symbol: f.symbol,
          side: f.side,
          quantity: f.quantity,
          price: f.price,
          filledTime: f.filledTime.toISOString(),
          orderId: f.orderId,
          commission: f.commission,
          marketDate: f.marketDate,
        }));

        await savePersistedData({
          schemaVersion: CURRENT_SCHEMA_VERSION,
          fills: persistedFills,
          fillFingerprints: Array.from(state.fillFingerprints),
          settings: state.settings,
          importHistory: state.importHistory,
          adjustments: state.adjustments,
        });
      } catch (error) {
        console.error('Failed to persist to IndexedDB:', error);
      }
    }

    // Debounce persistence
    const timeoutId = setTimeout(persist, 500);
    return () => clearTimeout(timeoutId);
  }, [state.fills, state.settings, state.importHistory, state.adjustments, state.isHydrated, state.fillFingerprints]);

  const actions = {
    setLoading: useCallback((isLoading: boolean) => {
      dispatch({ type: 'SET_LOADING', payload: isLoading });
    }, []),
    
    setUploadStatus: useCallback((status: UploadStatus) => {
      dispatch({ type: 'SET_UPLOAD_STATUS', payload: status });
    }, []),
    
    setUploadResult: useCallback((result: ImportResult | null) => {
      dispatch({ type: 'SET_UPLOAD_RESULT', payload: result });
    }, []),
    
    importFills: useCallback((
      fills: Fill[], 
      metadata: { fileName: string; rowCount: number; fillCount: number; dateRange: { start: string; end: string } | null },
      mode: 'merge' | 'replace' = 'merge'
    ) => {
      dispatch({ type: 'IMPORT_FILLS', payload: { fills, metadata, mode } });
    }, []),
    
    clearImportHistory: useCallback(() => {
      dispatch({ type: 'CLEAR_IMPORT_HISTORY' });
    }, []),
    
    processData: useCallback(() => {
      dispatch({ type: 'PROCESS_DATA' });
    }, []),
    
    updateSettings: useCallback((settings: Partial<Settings>) => {
      dispatch({ type: 'SET_SETTINGS', payload: settings });
    }, []),
    
    addAdjustment: useCallback((adjustment: Adjustment) => {
      dispatch({ type: 'ADD_ADJUSTMENT', payload: adjustment });
    }, []),
    
    updateAdjustment: useCallback((adjustment: Adjustment) => {
      dispatch({ type: 'UPDATE_ADJUSTMENT', payload: adjustment });
    }, []),
    
    deleteAdjustment: useCallback((id: string) => {
      dispatch({ type: 'DELETE_ADJUSTMENT', payload: id });
    }, []),
    
    clearData: useCallback(async () => {
      try {
        await clearPersistedData();
      } catch (error) {
        console.error('Failed to clear IndexedDB:', error);
      }
      dispatch({ type: 'CLEAR_DATA' });
    }, []),
    
    dismissSchemaWarning: useCallback(() => {
      dispatch({ type: 'SET_SCHEMA_WARNING', payload: null });
    }, []),
  };

  return (
    <DashboardContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </DashboardContext.Provider>
  );
}

// ============================================================================
// HOOKS
// ============================================================================

export function useDashboard(): DashboardContextValue {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}

export function useDashboardState(): DashboardState {
  return useDashboard().state;
}

export function useDashboardActions(): DashboardContextValue['actions'] {
  return useDashboard().actions;
}