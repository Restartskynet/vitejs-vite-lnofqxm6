export type FillSide = "BUY" | "SELL";

export type ImportWarningLevel = "info" | "warn" | "warning" | "error";

export interface ImportWarning {
  level: WarningLevel;
  message: string;
  action?: string;
}

export interface WebullFill {
  id: string; // stable unique key
  symbol: string;
  side: FillSide;
  qty: number;
  price: number;
  ts: Date; // UTC Date created from ET timestamps
}

export interface Trade {
  id: string;
  symbol: string;

  // This is a POSITION SESSION (not individual legs).
  qty: number; // total shares closed (sum of session sells)
  entryPrice: number; // weighted avg entry
  exitPrice: number;  // weighted avg exit

  entryTs: Date;
  exitTs: Date;

  entryDate: string; // YYYY-MM-DD in MARKET TZ (America/New_York)
  exitDate: string;  // YYYY-MM-DD in MARKET TZ

  pnl: number;
  win: boolean;
  loss: boolean;

  legs: number; // number of sell lots used in the session
}

export interface DailyRow {
  date: string; // YYYY-MM-DD in MARKET TZ
  tradePnL: number;
  tradingEquity: number;
  accountEquity: number; // Phase 1: same as tradingEquity
  peakEquity: number;
  drawdownPct: number; // negative (e.g. -0.12)
  wins: number;
  losses: number;
  tradesClosed: number; // number of sessions closed
}

export type RiskMode = "LOW" | "HIGH";

export interface StrategyConfig {
  lowRiskPct: number;      // 0.001 = 0.10%
  highRiskPct: number;     // 0.03  = 3.00%
  lowWinsNeeded: number;   // 2
  highLossesNeeded: number; // 1
}

export interface RiskState {
  mode: RiskMode;
  lowWinsProgress: number;
  asOfCloseDate: string | null;

  todayDate: string;     // next business day after asOfCloseDate
  tomorrowDate: string;

  todayRiskPct: number;
  tomorrowBaseRiskPct: number;

  tomorrowIfWinRiskPct: number;
  tomorrowIfLossRiskPct: number;

  equityAsOfClose: number;
  allowedRiskDollars: number;
}
