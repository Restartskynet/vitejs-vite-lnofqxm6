// src/types/models.ts

export type FillSide = "BUY" | "SELL";
export type RiskMode = "LOW" | "HIGH";

export type ImportWarningLevel = "info" | "warn" | "warning" | "error";

/**
 * Warnings are deliberately simple:
 * - message: human readable
 * - code: stable identifier (optional but recommended)
 * - action: optional suggestion for UI
 */
export interface ImportWarning {
  level: ImportWarningLevel;
  message: string;
  code?: string;
  action?: string;
  meta?: Record<string, unknown>;
}

// Normalized fill (v1: Webull Orders Records CSV)
export interface WebullFill {
  id: string;
  symbol: string;
  side: FillSide;
  qty: number;
  price: number;
  ts: Date;
}

// Position session trade (built from fills)
export interface Trade {
  id: string;
  symbol: string;

  entryTs: Date;
  exitTs: Date;
  entryDate: string; // YYYY-MM-DD market date
  exitDate: string;  // YYYY-MM-DD market date

  entryPrice: number;
  exitPrice: number;
  qty: number;

  pnl: number;
  pct: number; // pnl / (entryPrice*qty)

  win: boolean;
  loss: boolean;

  legs: number; // number of fill legs used to build the session
}

// Daily aggregated row
export interface DailyRow {
  date: string; // YYYY-MM-DD market date
  tradesClosed: number;

  tradePnL: number;
  adjustment: number;

  tradingEquity: number; // startingEquity + cumulative tradePnL
  accountEquity: number; // tradingEquity + adjustment

  peakEquity: number;
  drawdownPct: number; // <= 0

  wins: number;
  losses: number;
}

// Metrics for the dashboard
export interface Metrics {
  totalTrades: number;
  wins: number;
  losses: number;
  winRatePct: number; // 0..100
  totalPnL: number;
  maxDrawdownPct: number; // <= 0
  endingEquity: number | null;
}

// Strategy config (Restart)
export interface StrategyConfig {
  lowRiskPct: number;
  highRiskPct: number;
  lowWinsNeeded: number;
  highLossesNeeded: number;
}

// Strategy state output
export interface RiskState {
  mode: RiskMode;

  // state tracking
  lowWinsProgress: number;

  // dates
  asOfCloseDate: string | null;
  todayDate: string;
  tomorrowDate: string;

  // risk numbers
  todayRiskPct: number;
  tomorrowBaseRiskPct: number;
  tomorrowIfWinRiskPct: number;
  tomorrowIfLossRiskPct: number;

  // equity + allowed risk
  equityAsOfClose: number;
  allowedRiskDollars: number;
}
