// src/types/models.ts

export type ImportWarningLevel = "info" | "warn" | "warning" | "error";

export interface ImportWarning {
  level: ImportWarningLevel;
  message: string;
  action?: string;
}

export type FillSide = "BUY" | "SELL";

export interface WebullFill {
  id: string;
  symbol: string;
  side: FillSide;
  qty: number;
  price: number;
  ts: Date;
}

export type PositionSide = "LONG" | "SHORT";

export interface Trade {
  tradeId: string;
  symbol: string;
  side: PositionSide;
  openTs: Date;
  closeTs: Date;
  qty: number;
  avgOpen: number;
  avgClose: number;
  pnl: number;
  pnlPct: number;
}

export interface DailyRow {
  date: string; // YYYY-MM-DD (market day key)
  realizedPnl: number;
  wins: number;
  losses: number;
  trades: number;
  equityClose: number;
}

export interface StrategyConfig {
  lowRiskPct: number;
  highRiskPct: number;
  lowWinsNeeded: number;
  highLossesNeeded: number;
}

export type RiskMode = "LOW" | "HIGH";

export interface RiskState {
  mode: RiskMode;

  asOfCloseDate: string | null; // last date present in daily[] or null
  todayDate: string; // market day key
  tomorrowDate: string; // next market day key

  equityUsed: number;
  todayRiskPct: number;
  allowedRiskDollars: number;

  restoreWinsNeeded: number;
  restoreWinsProgress: number;
  reason: string;

  tomorrowIfWinRiskPct: number;
  tomorrowIfLossRiskPct: number;
}

// KPI/summary object (keep flexible so UI can evolve safely)
export interface Metrics {
  [k: string]: number;
}
