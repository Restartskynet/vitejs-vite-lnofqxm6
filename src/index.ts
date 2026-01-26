// ============================================================================
// CORE DATA TYPES
// ============================================================================
export { Card, CardHeader, CardContent, CardFooter } from './Card';
export { Badge, ModeBadge, StatusBadge, SymbolBadge } from './Badge';
export { Button, IconButton } from './Button';
export { Input, CurrencyInput, PercentInput, SearchInput } from './Input';
export { Header } from './Header';
export { Navigation, MobileNavigation } from './Navigation';
export { TopSummaryStrip, CompactSummaryStrip } from './TopSummaryStrip';
export { AppShell, Page, Section } from './AppShell';
export { HeroRiskPanel } from './HeroRiskPanel';
export { PositionSizer } from './PositionSizer';
export { StrategyExplainer } from './StrategyExplainer';
export { DashboardPage } from './DashboardPage';
export { UploadPage } from './UploadPage';
export { TradesPage } from './TradesPage';
export { SettingsPage } from './SettingsPage';
/**
 * A single fill from the Webull CSV
 */
export interface Fill {
    id: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    filledTime: Date;
    orderId: string;
    commission: number;
  }
  
  /**
   * A closed trade (entry + exit)
   */
  export interface Trade {
    id: string;
    symbol: string;
    side: 'LONG' | 'SHORT';
    entryDate: Date;
    exitDate: Date;
    entryPrice: number;
    exitPrice: number;
    quantity: number;
    pnl: number;
    pnlPercent: number;
    commission: number;
    status: 'WIN' | 'LOSS' | 'BREAKEVEN';
    riskUsed: number;
  }
  
  /**
   * Daily equity snapshot
   */
  export interface DailyEquity {
    date: string; // YYYY-MM-DD
    tradingEquity: number;
    accountEquity: number;
    pnl: number;
    drawdownPct: number;
    peakEquity: number;
    tradeCount: number;
  }
  
  /**
   * Risk state for a given day
   */
  export interface RiskState {
    date: string;
    mode: 'HIGH' | 'LOW';
    riskPct: number;
    allowedRiskDollars: number;
    equity: number;
    lowWinsProgress: number;
    lowWinsNeeded: number;
  }
  
  /**
   * Tomorrow forecast scenarios
   */
  export interface RiskForecast {
    ifWin: {
      mode: 'HIGH' | 'LOW';
      riskPct: number;
    };
    ifLoss: {
      mode: 'HIGH' | 'LOW';
      riskPct: number;
    };
  }
  
  /**
   * Current risk output (what the user sees)
   */
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
  
  /**
   * Manual equity adjustment
   */
  export interface Adjustment {
    id: string;
    date: string;
    type: 'Deposit' | 'Withdrawal' | 'Fee' | 'Correction';
    amount: number;
    note: string;
  }
  
  /**
   * Aggregated performance metrics
   */
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
  
  /**
   * Import metadata
   */
  export interface ImportMetadata {
    fileName: string;
    importedAt: Date;
    rowCount: number;
    fillCount: number;
    dateRange: {
      start: string;
      end: string;
    };
  }
  
  /**
   * App settings
   */
  export interface Settings {
    startingEquity: number;
    startingDate: string;
    strategyId: string;
    theme: 'dark' | 'light';
  }
  
  /**
   * Strategy configuration
   */
  export interface StrategyConfig {
    id: string;
    name: string;
    highModeRiskPct: number;
    lowModeRiskPct: number;
    winsToRecover: number;
    lossesToDrop: number;
  }
  
  // ============================================================================
  // UI STATE TYPES
  // ============================================================================
  
  export type UploadStatus = 'idle' | 'uploading' | 'validating' | 'success' | 'error';
  
  export interface UploadResult {
    success: boolean;
    fileName?: string;
    fillCount?: number;
    tradeCount?: number;
    dateRange?: { start: string; end: string };
    errors?: string[];
  }
  
  export interface ValidationError {
    row: number;
    column: string;
    message: string;
  }
  
  export type Page = 'dashboard' | 'upload' | 'trades' | 'settings';
  
  // ============================================================================
  // DEFAULT VALUES
  // ============================================================================
  
  export const DEFAULT_STRATEGY: StrategyConfig = {
    id: 'restart-throttle',
    name: 'Restart Throttle',
    highModeRiskPct: 0.03,    // 3%
    lowModeRiskPct: 0.001,    // 0.1%
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