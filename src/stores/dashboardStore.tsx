import React, { createContext, useContext, useReducer, useCallback, useEffect, useState, type ReactNode } from 'react';
import type { Fill, Trade, DailyEquity, ImportResult, StrategyConfig } from '../engine/types';
import type { Metrics, Settings, UploadStatus, CurrentRisk, ImportHistoryEntry, PersistedFill, PersistedData, PersistedAdjustment } from '../types';
import { DEFAULT_SETTINGS, EMPTY_METRICS, EMPTY_CURRENT_RISK, CURRENT_SCHEMA_VERSION, DEFAULT_STRATEGY } from '../types';
import { buildTrades, calculateMetrics } from '../engine/tradesBuilder';
import { getCurrentRisk, calculateDailyEquity, calculateMaxDrawdown } from '../engine/riskEngine';
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
  strategy: StrategyConfig;

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
  strategy: { ...DEFAULT_STRATEGY },
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
  | { type: 'SET_ADJUSTMENTS'; payload: Adjustment[] }
  | { type: 'SET_STRATEGY'; payload: StrategyConfig }
  | { type: 'IMPORT_BACKUP'; payload: { data: PersistedData; mode: 'replace' | 'merge' } }
  | { type: 'CLEAR_DATA' }
  | { type: 'HYDRATE'; payload: { fills: Fill[]; fingerprints: string[]; settings: Settings; importHistory: ImportHistoryEntry[]; adjustments: Adjustment[]; strategy?: StrategyConfig } }
  | { type: 'SET_HYDRATED' }
  | { type: 'SET_SCHEMA_WARNING'; payload: string | null };

/**
 * Calculate total adjustments up to a given date
 */
function calculateAdjustmentsToDate(adjustments: Adjustment[], date: string): number {
  return adjustments
    .filter(adj => adj.date <= date)
    .reduce((sum, adj) => sum + adj.amount, 0);
}

/**
 * Calculate total adjustments
 */
function calculateTotalAdjustments(adjustments: Adjustment[]): number {
  return adjustments.reduce((sum, adj) => sum + adj.amount, 0);
}

/**
 * Recompute derived data from fills including adjustments
 */
function recomputeDerivedData(
  fills: Fill[], 
  startingEquity: number, 
  adjustments: Adjustment[] = [],
  strategy: StrategyConfig = DEFAULT_STRATEGY
) {
  // buildTrades returns { trades, riskTimeline } - MUST destructure!
  const buildResult = buildTrades(fills, startingEquity);
  
  // Extract the trades array from the result
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
  
  // Calculate daily equity with adjustments applied
  const baseDailyEquity = calculateDailyEquity(tradesArray, startingEquity);
  
  // Apply adjustments to daily equity
  const dailyEquity = baseDailyEquity.map(day => {
    const adjustmentToDate = calculateAdjustmentsToDate(adjustments, day.date);
    return {
      ...day,
      accountEquity: day.tradingEquity + adjustmentToDate,
    };
  });
  
  metrics.maxDrawdownPct = calculateMaxDrawdown(dailyEquity);
  
  // Calculate risk state with adjusted equity
  const totalAdjustments = calculateTotalAdjustments(adjustments);
  const adjustedStartingEquity = startingEquity + totalAdjustments;
  const riskState = getCurrentRisk(tradesArray, adjustedStartingEquity, strategy);
  
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
      
      // Recompute derived data with adjustments
      const derived = recomputeDerivedData(mergedFills, state.settings.startingEquity, state.adjustments, state.strategy);
      
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
        importHistory: [historyEntry, ...state.importHistory].slice(0, 50),
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
      const derived = recomputeDerivedData(state.fills, state.settings.startingEquity, state.adjustments, state.strategy);
      return { ...state, ...derived };
    }

    case 'SET_SETTINGS': {
      const newSettings = { ...state.settings, ...action.payload };
      
      if (action.payload.startingEquity && state.hasData) {
        const derived = recomputeDerivedData(state.fills, newSettings.startingEquity, state.adjustments, state.strategy);
        return { ...state, settings: newSettings, ...derived };
      }
      
      return { ...state, settings: newSettings };
    }

    case 'ADD_ADJUSTMENT': {
      const newAdjustments = [...state.adjustments, action.payload];
      const derived = recomputeDerivedData(state.fills, state.settings.startingEquity, newAdjustments, state.strategy);
      return { ...state, adjustments: newAdjustments, ...derived };
    }

    case 'UPDATE_ADJUSTMENT': {
      const newAdjustments = state.adjustments.map((a) =>
        a.id === action.payload.id ? action.payload : a
      );
      const derived = recomputeDerivedData(state.fills, state.settings.startingEquity, newAdjustments, state.strategy);
      return { ...state, adjustments: newAdjustments, ...derived };
    }

    case 'DELETE_ADJUSTMENT': {
      const newAdjustments = state.adjustments.filter((a) => a.id !== action.payload);
      const derived = recomputeDerivedData(state.fills, state.settings.startingEquity, newAdjustments, state.strategy);
      return { ...state, adjustments: newAdjustments, ...derived };
    }

    case 'SET_ADJUSTMENTS': {
      const derived = recomputeDerivedData(state.fills, state.settings.startingEquity, action.payload, state.strategy);
      return { ...state, adjustments: action.payload, ...derived };
    }

    case 'SET_STRATEGY': {
      const derived = recomputeDerivedData(state.fills, state.settings.startingEquity, state.adjustments, action.payload);
      return { ...state, strategy: action.payload, ...derived };
    }

    case 'IMPORT_BACKUP': {
      const { data, mode } = action.payload;
      
      if (mode === 'replace') {
        // Replace all data
        const fills = data.fills.map(pf => ({
          ...pf,
          filledTime: new Date(pf.filledTime),
        }));
        
        const derived = recomputeDerivedData(
          fills, 
          data.settings?.startingEquity || state.settings.startingEquity,
          data.adjustments || [],
          state.strategy
        );
        
        return {
          ...state,
          fills,
          fillFingerprints: new Set(data.fillFingerprints || []),
          settings: data.settings || state.settings,
          importHistory: data.importHistory || [],
          adjustments: data.adjustments || [],
          ...derived,
          hasData: fills.length > 0,
        };
      } else {
        // Merge mode
        const existingFps = new Set(state.fillFingerprints);
        const existingHistoryIds = new Set(state.importHistory.map(h => h.id));
        const existingAdjIds = new Set(state.adjustments.map(a => a.id));
        
        // Merge fills
        const newFills = data.fills
          .filter(pf => !existingFps.has(pf.fingerprint || pf.id))
          .map(pf => ({
            ...pf,
            filledTime: new Date(pf.filledTime),
          }));
        
        const mergedFills = [...state.fills, ...newFills].sort(
          (a, b) => a.filledTime.getTime() - b.filledTime.getTime()
        );
        
        // Merge fingerprints
        const mergedFps = new Set(state.fillFingerprints);
        data.fillFingerprints?.forEach(fp => mergedFps.add(fp));
        
        // Merge import history
        const newHistory = (data.importHistory || []).filter(h => !existingHistoryIds.has(h.id));
        const mergedHistory = [...state.importHistory, ...newHistory].slice(0, 50);
        
        // Merge adjustments
        const newAdjustments = (data.adjustments || []).filter(a => !existingAdjIds.has(a.id));
        const mergedAdjustments = [...state.adjustments, ...newAdjustments];
        
        const derived = recomputeDerivedData(
          mergedFills, 
          state.settings.startingEquity,
          mergedAdjustments,
          state.strategy
        );
        
        return {
          ...state,
          fills: mergedFills,
          fillFingerprints: mergedFps,
          importHistory: mergedHistory,
          adjustments: mergedAdjustments,
          ...derived,
          hasData: mergedFills.length > 0,
        };
      }
    }

    case 'CLEAR_DATA': {
      return {
        ...initialState,
        settings: state.settings,
        strategy: state.strategy,
        isHydrated: true,
        isLoading: false,
      };
    }

    case 'HYDRATE': {
      const { fills, fingerprints, settings, importHistory, adjustments, strategy } = action.payload;
      
      // Convert ISO strings back to Date objects
      const hydratedFills = fills.map(f => ({
        ...f,
        filledTime: new Date(f.filledTime),
      }));
      
      const hydratedStrategy = strategy || state.strategy;
      const derived = recomputeDerivedData(hydratedFills, settings.startingEquity, adjustments, hydratedStrategy);
      
      return {
        ...state,
        fills: hydratedFills,
        fillFingerprints: new Set(fingerprints),
        settings,
        importHistory,
        adjustments,
        strategy: hydratedStrategy,
        ...derived,
        hasData: hydratedFills.length > 0,
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
  actions: {
    setUploadStatus: (status: UploadStatus) => void;
    setUploadResult: (result: ImportResult | null) => void;
    importFills: (fills: Fill[], metadata: { fileName: string; rowCount: number; fillCount: number; dateRange: { start: string; end: string } | null }, mode: 'merge' | 'replace') => Promise<void>;
    clearImportHistory: () => void;
    updateSettings: (settings: Partial<Settings>) => void;
    addAdjustment: (adjustment: Adjustment) => void;
    updateAdjustment: (adjustment: Adjustment) => void;
    deleteAdjustment: (id: string) => void;
    updateStrategy: (strategy: StrategyConfig) => void;
    importBackup: (data: PersistedData, mode: 'replace' | 'merge') => Promise<void>;
    clearData: () => Promise<void>;
    processData: () => void;
  };
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);
  const [saveQueued, setSaveQueued] = useState(false);

  // Load persisted data on mount
  useEffect(() => {
    async function hydrate() {
      if (!isIndexedDBAvailable()) {
        console.warn('IndexedDB not available');
        dispatch({ type: 'SET_HYDRATED' });
        return;
      }

      try {
        const data = await loadPersistedData();
        
        if (data) {
          // Check schema version
          if (data.schemaVersion > CURRENT_SCHEMA_VERSION) {
            dispatch({ 
              type: 'SET_SCHEMA_WARNING', 
              payload: `Data was created with a newer version (v${data.schemaVersion}). Some features may not work correctly.` 
            });
          }
          
          dispatch({
            type: 'HYDRATE',
            payload: {
              fills: data.fills.map(pf => ({
                id: pf.id,
                symbol: pf.symbol,
                side: pf.side,
                quantity: pf.quantity,
                price: pf.price,
                filledTime: new Date(pf.filledTime),
                orderId: pf.orderId,
                commission: pf.commission,
                marketDate: pf.marketDate,
              })),
              fingerprints: data.fillFingerprints,
              settings: data.settings,
              importHistory: data.importHistory,
              adjustments: data.adjustments,
              strategy: (data as PersistedData & { strategy?: StrategyConfig }).strategy,
            },
          });
        } else {
          dispatch({ type: 'SET_HYDRATED' });
        }
      } catch (error) {
        console.error('Failed to load persisted data:', error);
        dispatch({ type: 'SET_HYDRATED' });
      }
    }

    hydrate();
  }, []);

  // Persist data when state changes (debounced)
  useEffect(() => {
    if (!state.isHydrated || state.isLoading) return;

    setSaveQueued(true);
    const timeout = setTimeout(async () => {
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

        const dataToSave: PersistedData & { strategy?: StrategyConfig } = {
          schemaVersion: CURRENT_SCHEMA_VERSION,
          fills: persistedFills,
          fillFingerprints: Array.from(state.fillFingerprints),
          settings: state.settings,
          importHistory: state.importHistory,
          adjustments: state.adjustments,
          strategy: state.strategy,
        };

        await savePersistedData(dataToSave);
        setSaveQueued(false);
      } catch (error) {
        console.error('Failed to persist data:', error);
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [state.fills, state.settings, state.importHistory, state.adjustments, state.strategy, state.isHydrated, state.isLoading, state.fillFingerprints]);

  // Actions
  const setUploadStatus = useCallback((status: UploadStatus) => {
    dispatch({ type: 'SET_UPLOAD_STATUS', payload: status });
  }, []);

  const setUploadResult = useCallback((result: ImportResult | null) => {
    dispatch({ type: 'SET_UPLOAD_RESULT', payload: result });
  }, []);

  const importFills = useCallback(async (
    fills: Fill[],
    metadata: { fileName: string; rowCount: number; fillCount: number; dateRange: { start: string; end: string } | null },
    mode: 'merge' | 'replace'
  ) => {
    dispatch({ type: 'IMPORT_FILLS', payload: { fills, metadata, mode } });
  }, []);

  const clearImportHistory = useCallback(() => {
    dispatch({ type: 'CLEAR_IMPORT_HISTORY' });
  }, []);

  const updateSettings = useCallback((settings: Partial<Settings>) => {
    dispatch({ type: 'SET_SETTINGS', payload: settings });
  }, []);

  const addAdjustment = useCallback((adjustment: Adjustment) => {
    dispatch({ type: 'ADD_ADJUSTMENT', payload: adjustment });
  }, []);

  const updateAdjustment = useCallback((adjustment: Adjustment) => {
    dispatch({ type: 'UPDATE_ADJUSTMENT', payload: adjustment });
  }, []);

  const deleteAdjustment = useCallback((id: string) => {
    dispatch({ type: 'DELETE_ADJUSTMENT', payload: id });
  }, []);

  const updateStrategy = useCallback((strategy: StrategyConfig) => {
    dispatch({ type: 'SET_STRATEGY', payload: strategy });
  }, []);

  const importBackup = useCallback(async (data: PersistedData, mode: 'replace' | 'merge') => {
    dispatch({ type: 'IMPORT_BACKUP', payload: { data, mode } });
  }, []);

  const clearData = useCallback(async () => {
    try {
      await clearPersistedData();
      dispatch({ type: 'CLEAR_DATA' });
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  }, []);

  const processData = useCallback(() => {
    dispatch({ type: 'PROCESS_DATA' });
  }, []);

  const value: DashboardContextValue = {
    state,
    actions: {
      setUploadStatus,
      setUploadResult,
      importFills,
      clearImportHistory,
      updateSettings,
      addAdjustment,
      updateAdjustment,
      deleteAdjustment,
      updateStrategy,
      importBackup,
      clearData,
      processData,
    },
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

// ============================================================================
// HOOKS
// ============================================================================

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}

/**
 * Convenience hook that returns just the state (for components that only need to read state)
 * This is the shape expected by components importing useDashboardState
 */
export function useDashboardState() {
  const { state } = useDashboard();
  return {
    // Raw data
    fills: state.fills,
    fillFingerprints: state.fillFingerprints,
    importMetadata: state.importMetadata,
    
    // Import history
    importHistory: state.importHistory,
    
    // Derived data
    trades: state.trades,
    dailyEquity: state.dailyEquity,
    currentRisk: state.currentRisk,
    metrics: state.metrics,
    
    // User config
    settings: state.settings,
    adjustments: state.adjustments,
    strategy: state.strategy,
    
    // UI state
    uploadStatus: state.uploadStatus,
    uploadResult: state.uploadResult,
    isLoading: state.isLoading,
    hasData: state.hasData,
    isHydrated: state.isHydrated,
    schemaWarning: state.schemaWarning,
  };
}