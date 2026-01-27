// ============================================================================
// APPLICATION TYPES
// Re-exports engine types and adds app-specific types
// ============================================================================

// Re-export all engine types for convenience
export type {
  Fill,
  Trade,
  DailyEquity,
  RiskState,
  StrategyConfig,
  ImportResult,
  ValidationError,
  ValidationWarning,
  CSVPreview,
  WebullFill,
} from '../engine/types';

// ============================================================================
// APP-SPECIFIC TYPES
// ============================================================================

export interface CurrentRisk {
  asOfDate: string;
  mode: 'HIGH' | 'LOW';
  todayRiskPct: number;
  allowedRiskDollars: number;
  equity: number;
  lowWinsProgress: number;
  lowWinsNeeded: number;
  forecast: RiskForecast;
}

export interface RiskForecast {
  ifWin: { mode: 'HIGH' | 'LOW'; riskPct: number };
  ifLoss: { mode: 'HIGH' | 'LOW'; riskPct: number };
}

export interface Adjustment {
  id: string;
  date: string;
  type: 'Deposit' | 'Withdrawal' | 'Fee' | 'Correction';
  amount: number;
  note: string;
}

export interface Metrics {
  totalTrades: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number;
  totalPnL: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  maxDrawdownPct: number;
  currentStreak: number;
  streakType: 'WIN' | 'LOSS' | 'NONE';
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
}

export interface ImportMetadata {
  fileName: string;
  importedAt: Date;
  rowCount: number;
  fillCount: number;
  dateRange: { start: string; end: string } | null;
}

export interface Settings {
  startingEquity: number;
  startingDate: string;
  strategyId: string;
  theme: 'dark' | 'light';
}

export type UploadStatus = 'idle' | 'uploading' | 'validating' | 'success' | 'error';

export interface UploadResult {
  success: boolean;
  fileName?: string;
  fillCount?: number;
  tradeCount?: number;
  dateRange?: { start: string; end: string };
  errors?: string[];
}

export type Page = 'dashboard' | 'upload' | 'trades' | 'settings';

// ============================================================================
// DEFAULT VALUES
// ============================================================================

import type { StrategyConfig } from '../engine/types';

export const DEFAULT_STRATEGY: StrategyConfig = {
  id: 'restart-throttle',
  name: 'Restart Throttle',
  highModeRiskPct: 0.03,
  lowModeRiskPct: 0.001,
  winsToRecover: 2,
  lossesToDrop: 1,
};

export const DEFAULT_SETTINGS: Settings = {
  startingEquity: 25000,
  startingDate: new Date().toISOString().split('T')[0],
  strategyId: 'restart-throttle',
  theme: 'dark',
};

export const EMPTY_METRICS: Metrics = {
  totalTrades: 0,
  wins: 0,
  losses: 0,
  breakeven: 0,
  winRate: 0,
  totalPnL: 0,
  avgWin: 0,
  avgLoss: 0,
  profitFactor: 0,
  maxDrawdownPct: 0,
  currentStreak: 0,
  streakType: 'NONE',
  maxConsecutiveWins: 0,
  maxConsecutiveLosses: 0,
};

export const EMPTY_CURRENT_RISK: CurrentRisk = {
  asOfDate: new Date().toISOString().split('T')[0],
  mode: 'HIGH',
  todayRiskPct: 0.03,
  allowedRiskDollars: 0,
  equity: 0,
  lowWinsProgress: 0,
  lowWinsNeeded: 2,
  forecast: {
    ifWin: { mode: 'HIGH', riskPct: 0.03 },
    ifLoss: { mode: 'LOW', riskPct: 0.001 },
  },
};
// Import history types
export type {
  ImportHistoryEntry,
  PersistedData,
  PersistedFill,
  PersistedSettings,
  PersistedAdjustment,
} from './importHistory';
export { CURRENT_SCHEMA_VERSION } from './importHistory';