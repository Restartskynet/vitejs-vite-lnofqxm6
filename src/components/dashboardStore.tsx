import React, { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react';
import type {
  Fill,
  Trade,
  DailyEquity,
  CurrentRisk,
  Metrics,
  Adjustment,
  Settings,
  ImportMetadata,
  UploadStatus,
  UploadResult,
} from '../types';
import {
  DEFAULT_SETTINGS,
  EMPTY_METRICS,
  EMPTY_CURRENT_RISK,
} from '../types';

// ============================================================================
// STATE INTERFACE
// ============================================================================

interface DashboardState {
  // Raw data
  fills: Fill[];
  importMetadata: ImportMetadata | null;

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
  uploadResult: UploadResult | null;
  isLoading: boolean;
  hasData: boolean;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

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
  | { type: 'SET_UPLOAD_RESULT'; payload: UploadResult | null }
  | { type: 'SET_FILLS'; payload: { fills: Fill[]; metadata: ImportMetadata } }
  | { type: 'SET_TRADES'; payload: Trade[] }
  | { type: 'SET_DAILY_EQUITY'; payload: DailyEquity[] }
  | { type: 'SET_CURRENT_RISK'; payload: CurrentRisk }
  | { type: 'SET_METRICS'; payload: Metrics }
  | { type: 'SET_SETTINGS'; payload: Partial<Settings> }
  | { type: 'ADD_ADJUSTMENT'; payload: Adjustment }
  | { type: 'UPDATE_ADJUSTMENT'; payload: Adjustment }
  | { type: 'DELETE_ADJUSTMENT'; payload: string }
  | { type: 'CLEAR_DATA' }
  | { type: 'RESTORE_STATE'; payload: Partial<DashboardState> };

// ============================================================================
// REDUCER
// ============================================================================

function dashboardReducer(state: DashboardState, action: Action): DashboardState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_UPLOAD_STATUS':
      return { ...state, uploadStatus: action.payload };

    case 'SET_UPLOAD_RESULT':
      return { ...state, uploadResult: action.payload };

    case 'SET_FILLS':
      return {
        ...state,
        fills: action.payload.fills,
        importMetadata: action.payload.metadata,
        hasData: action.payload.fills.length > 0,
      };

    case 'SET_TRADES':
      return { ...state, trades: action.payload };

    case 'SET_DAILY_EQUITY':
      return { ...state, dailyEquity: action.payload };

    case 'SET_CURRENT_RISK':
      return { ...state, currentRisk: action.payload };

    case 'SET_METRICS':
      return { ...state, metrics: action.payload };

    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };

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
        settings: state.settings, // Preserve settings
      };

    case 'RESTORE_STATE':
      return { ...state, ...action.payload };

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
    setUploadResult: (result: UploadResult | null) => void;
    setFills: (fills: Fill[], metadata: ImportMetadata) => void;
    setTrades: (trades: Trade[]) => void;
    setDailyEquity: (dailyEquity: DailyEquity[]) => void;
    setCurrentRisk: (risk: CurrentRisk) => void;
    setMetrics: (metrics: Metrics) => void;
    updateSettings: (settings: Partial<Settings>) => void;
    addAdjustment: (adjustment: Adjustment) => void;
    updateAdjustment: (adjustment: Adjustment) => void;
    deleteAdjustment: (id: string) => void;
    clearData: () => void;
    restoreState: (state: Partial<DashboardState>) => void;
  };
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface DashboardProviderProps {
  children: ReactNode;
}

export function DashboardProvider({ children }: DashboardProviderProps) {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);

  const actions = {
    setLoading: useCallback((isLoading: boolean) => {
      dispatch({ type: 'SET_LOADING', payload: isLoading });
    }, []),

    setUploadStatus: useCallback((status: UploadStatus) => {
      dispatch({ type: 'SET_UPLOAD_STATUS', payload: status });
    }, []),

    setUploadResult: useCallback((result: UploadResult | null) => {
      dispatch({ type: 'SET_UPLOAD_RESULT', payload: result });
    }, []),

    setFills: useCallback((fills: Fill[], metadata: ImportMetadata) => {
      dispatch({ type: 'SET_FILLS', payload: { fills, metadata } });
    }, []),

    setTrades: useCallback((trades: Trade[]) => {
      dispatch({ type: 'SET_TRADES', payload: trades });
    }, []),

    setDailyEquity: useCallback((dailyEquity: DailyEquity[]) => {
      dispatch({ type: 'SET_DAILY_EQUITY', payload: dailyEquity });
    }, []),

    setCurrentRisk: useCallback((risk: CurrentRisk) => {
      dispatch({ type: 'SET_CURRENT_RISK', payload: risk });
    }, []),

    setMetrics: useCallback((metrics: Metrics) => {
      dispatch({ type: 'SET_METRICS', payload: metrics });
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

    clearData: useCallback(() => {
      dispatch({ type: 'CLEAR_DATA' });
    }, []),

    restoreState: useCallback((restoredState: Partial<DashboardState>) => {
      dispatch({ type: 'RESTORE_STATE', payload: restoredState });
    }, []),
  };

  return (
    <DashboardContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </DashboardContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useDashboard(): DashboardContextValue {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}

// Export for direct state access
export function useDashboardState(): DashboardState {
  return useDashboard().state;
}

export function useDashboardActions(): DashboardContextValue['actions'] {
  return useDashboard().actions;
}