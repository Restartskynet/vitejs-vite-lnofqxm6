import React, { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react';
import type { Fill, Trade, DailyEquity, ImportResult } from '../engine/types';
import type { Metrics, Settings, UploadStatus, CurrentRisk } from '../types';
import { DEFAULT_SETTINGS, EMPTY_METRICS, EMPTY_CURRENT_RISK } from '../types';
import { buildTrades, calculateMetrics } from '../engine/tradesBuilder';
import { getCurrentRisk, calculateDailyEquity, calculateMaxDrawdown, DEFAULT_STRATEGY } from '../engine/riskEngine';

// ============================================================================
// STATE INTERFACE
// ============================================================================

interface DashboardState {
  // Raw data
  fills: Fill[];
  importMetadata: {
    fileName: string;
    importedAt: Date;
    rowCount: number;
    fillCount: number;
    dateRange: { start: string; end: string } | null;
  } | null;

  // Derived data
  trades: Trade[];
  dailyEquity: DailyEquity[];
  currentRisk: CurrentRisk;
  metrics: Metrics;

  // User config
  settings: Settings;
  adjustments: Array<{
    id: string;
    date: string;
    type: 'Deposit' | 'Withdrawal' | 'Fee' | 'Correction';
    amount: number;
    note: string;
  }>;

  // UI state
  uploadStatus: UploadStatus;
  uploadResult: ImportResult | null;
  isLoading: boolean;
  hasData: boolean;
}

const initialState: DashboardState = {
  fills: [],
  importMetadata: null,
  trades: [],
  dailyEquity: [],
  currentRisk: EMPTY_CURRENT_RISK,
  metrics: EMPTY_METRICS,
  settings: DEFAULT_SETTINGS,
  adjustments: [],
  uploadStatus: 'idle',
  uploadResult: null,
  isLoading: false,
  hasData: false,
};

// ============================================================================
// ACTIONS
// ============================================================================

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_UPLOAD_STATUS'; payload: UploadStatus }
  | { type: 'SET_UPLOAD_RESULT'; payload: ImportResult | null }
  | { type: 'IMPORT_FILLS'; payload: { fills: Fill[]; metadata: { fileName: string; rowCount: number; fillCount: number; dateRange: { start: string; end: string } | null } } }
  | { type: 'PROCESS_DATA' }
  | { type: 'SET_SETTINGS'; payload: Partial<Settings> }
  | { type: 'ADD_ADJUSTMENT'; payload: { id: string; date: string; type: 'Deposit' | 'Withdrawal' | 'Fee' | 'Correction'; amount: number; note: string } }
  | { type: 'UPDATE_ADJUSTMENT'; payload: { id: string; date: string; type: 'Deposit' | 'Withdrawal' | 'Fee' | 'Correction'; amount: number; note: string } }
  | { type: 'DELETE_ADJUSTMENT'; payload: string }
  | { type: 'CLEAR_DATA' };

function dashboardReducer(state: DashboardState, action: Action): DashboardState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_UPLOAD_STATUS':
      return { ...state, uploadStatus: action.payload };

    case 'SET_UPLOAD_RESULT':
      return { ...state, uploadResult: action.payload };

    case 'IMPORT_FILLS': {
      const { fills, metadata } = action.payload;
      
      // Build trades from fills
      const trades = buildTrades(fills, state.settings.startingEquity);
      
      // Calculate metrics
      const metrics = calculateMetrics(trades);
      
      // Calculate daily equity
      const dailyEquity = calculateDailyEquity(trades, state.settings.startingEquity);
      
      // Update max drawdown in metrics
      metrics.maxDrawdownPct = calculateMaxDrawdown(dailyEquity);
      
      // Get current risk state
      const riskState = getCurrentRisk(trades, state.settings.startingEquity, DEFAULT_STRATEGY);
      
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

      return {
        ...state,
        fills,
        importMetadata: {
          fileName: metadata.fileName,
          importedAt: new Date(),
          rowCount: metadata.rowCount,
          fillCount: metadata.fillCount,
          dateRange: metadata.dateRange,
        },
        trades,
        dailyEquity,
        currentRisk,
        metrics,
        hasData: fills.length > 0,
        uploadStatus: 'success',
      };
    }

    case 'PROCESS_DATA': {
      // Rebuild derived data from current fills
      const trades = buildTrades(state.fills, state.settings.startingEquity);
      const metrics = calculateMetrics(trades);
      const dailyEquity = calculateDailyEquity(trades, state.settings.startingEquity);
      metrics.maxDrawdownPct = calculateMaxDrawdown(dailyEquity);
      const riskState = getCurrentRisk(trades, state.settings.startingEquity, DEFAULT_STRATEGY);
      
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

      return {
        ...state,
        trades,
        dailyEquity,
        currentRisk,
        metrics,
      };
    }

    case 'SET_SETTINGS': {
      const newSettings = { ...state.settings, ...action.payload };
      
      // If starting equity changed and we have data, reprocess
      if (action.payload.startingEquity && state.hasData) {
        const trades = buildTrades(state.fills, newSettings.startingEquity);
        const metrics = calculateMetrics(trades);
        const dailyEquity = calculateDailyEquity(trades, newSettings.startingEquity);
        metrics.maxDrawdownPct = calculateMaxDrawdown(dailyEquity);
        const riskState = getCurrentRisk(trades, newSettings.startingEquity, DEFAULT_STRATEGY);
        
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

        return {
          ...state,
          settings: newSettings,
          trades,
          dailyEquity,
          currentRisk,
          metrics,
        };
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
      return { ...initialState, settings: state.settings };

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
    importFills: (fills: Fill[], metadata: { fileName: string; rowCount: number; fillCount: number; dateRange: { start: string; end: string } | null }) => void;
    processData: () => void;
    updateSettings: (settings: Partial<Settings>) => void;
    addAdjustment: (adjustment: { id: string; date: string; type: 'Deposit' | 'Withdrawal' | 'Fee' | 'Correction'; amount: number; note: string }) => void;
    updateAdjustment: (adjustment: { id: string; date: string; type: 'Deposit' | 'Withdrawal' | 'Fee' | 'Correction'; amount: number; note: string }) => void;
    deleteAdjustment: (id: string) => void;
    clearData: () => void;
  };
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);

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
    importFills: useCallback((fills: Fill[], metadata: { fileName: string; rowCount: number; fillCount: number; dateRange: { start: string; end: string } | null }) => {
      dispatch({ type: 'IMPORT_FILLS', payload: { fills, metadata } });
    }, []),
    processData: useCallback(() => {
      dispatch({ type: 'PROCESS_DATA' });
    }, []),
    updateSettings: useCallback((settings: Partial<Settings>) => {
      dispatch({ type: 'SET_SETTINGS', payload: settings });
    }, []),
    addAdjustment: useCallback((adjustment: { id: string; date: string; type: 'Deposit' | 'Withdrawal' | 'Fee' | 'Correction'; amount: number; note: string }) => {
      dispatch({ type: 'ADD_ADJUSTMENT', payload: adjustment });
    }, []),
    updateAdjustment: useCallback((adjustment: { id: string; date: string; type: 'Deposit' | 'Withdrawal' | 'Fee' | 'Correction'; amount: number; note: string }) => {
      dispatch({ type: 'UPDATE_ADJUSTMENT', payload: adjustment });
    }, []),
    deleteAdjustment: useCallback((id: string) => {
      dispatch({ type: 'DELETE_ADJUSTMENT', payload: id });
    }, []),
    clearData: useCallback(() => {
      dispatch({ type: 'CLEAR_DATA' });
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