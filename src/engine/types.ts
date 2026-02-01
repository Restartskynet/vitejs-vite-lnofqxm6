// ============================================================================
// ENGINE TYPES - Core data structures for the calculation engine
// This is the CANONICAL source of truth for all data types
// ============================================================================

/**
 * Raw fill from Webull CSV
 */
export interface WebullFill {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  filledTime: Date;
  orderId: string;
  commission: number;
  orderType: string;
  status: string;
}

/**
 * Normalized fill for internal processing
 */
export interface Fill {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  filledTime: Date;
  placedTime?: Date | null;
  orderId: string;
  commission: number;
  marketDate: string; // YYYY-MM-DD in ET
  rowIndex: number;
  stopPrice?: number | null;
  totalQuantity?: number | null;
  status?: string | null;
}
/**
 * Trade status
 */
export type TradeStatus = 'ACTIVE' | 'CLOSED';

/**
 * Trade outcome for closed trades only
 */
export type ClosedTradeOutcome = 'WIN' | 'LOSS' | 'BREAKEVEN';
/**
 * A completed trade (entry + exit fills matched)
 */
export interface Trade {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  status: TradeStatus;
  
  // Entry
  entryDate: Date;
  entryDayKey: string;
  entryPrice: number;
  entryFills: Fill[];
  
  // Exit (for closed trades)
  exitDate: Date | null;
  exitDayKey: string | null;
  exitPrice: number | null;
  exitFills: Fill[];
  
  // Position
  quantity: number;
  remainingQty: number;
  
  // P&L
  realizedPnL: number;
  unrealizedPnL: number;
  totalPnL: number;
  pnlPercent: number;
  commission: number;
  
  // Risk
  riskUsed: number;
  riskPercent: number;
  stopPrice: number | null;
  modeAtEntry: 'HIGH' | 'LOW';
  riskPctAtEntry: number;
  equityAtEntry: number;
  riskDollarsAtEntry: number;
  
  // Classification
  outcome: ClosedTradeOutcome | 'ACTIVE';
  
  // Metadata
  marketDate: string;
  durationMinutes: number | null;
}

/**
 * Daily equity snapshot
 */
export interface DailyEquity {
  date: string;
  tradingEquity: number;
  accountEquity: number;
  dayPnL: number;
  cumulativePnL: number;
  drawdownPct: number;
  peakEquity: number;
  tradeCount: number;
  winCount: number;
  lossCount: number;
}

/**
 * Risk state for a specific point in time
 */
export interface RiskState {
  date: string;
  mode: 'HIGH' | 'LOW';
  riskPct: number;
  allowedRiskDollars: number;
  equity: number;
  lowWinsProgress: number;
  lowWinsNeeded: number;
  lastTradeOutcome: ClosedTradeOutcome | null;
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

/**
 * Import result with validation info
 */
export interface ImportResult {
  success: boolean;
  fills: Fill[];
  errors: ValidationError[];
  warnings: ValidationWarning[];
  stats: {
    totalRows: number;
    validFills: number;
    skippedRows: number;
    dateRange: { start: string; end: string } | null;
    symbols: string[];
  };
}

export interface ValidationError {
  row: number;
  column: string;
  message: string;
  value: string;
}

export interface ValidationWarning {
  row: number;
  message: string;
}

/**
 * CSV preview data
 */
export interface CSVPreview {
  headers: string[];
  rows: string[][];
  totalRows: number;
  hasRequiredColumns: boolean;
  missingColumns: string[];
}
/**
 * Skipped row info for import feedback
 */
export interface SkippedRow {
  rowIndex: number;
  reasons: string[];
  rawData: Record<string, string>;
}

/**
 * Detected CSV format
 */
export type WebullCSVFormat = 'orders-records' | 'orders-fills' | 'unknown';

/**
 * Extended CSV preview with format detection
 */
export interface CSVPreviewExtended extends CSVPreview {
  detectedFormat: WebullCSVFormat;
  formatConfidence: 'high' | 'medium' | 'low';
  allRows: string[][];
}

/**
 * Extended import result with skipped rows detail
 */
export interface ImportResultExtended extends ImportResult {
  detectedFormat: WebullCSVFormat;
  skippedRows: SkippedRow[];
  pendingOrders: PendingOrder[];
  orders?: OrderRecord[];
}

/**
 * Pending order for stop/target inference
 */
export interface PendingOrder {
  symbol: string;
  side: 'BUY' | 'SELL';
  price: number | null;
  stopPrice: number | null;
  limitPrice: number | null;
  quantity: number;
  placedTime: Date;
  type: 'STOP' | 'LIMIT' | 'MARKET' | 'UNKNOWN';
  status?: 'PENDING' | 'CANCELLED' | 'FILLED' | 'UNKNOWN';
}

/**
 * Normalized order record from Webull Orders Records CSV
 */
export interface OrderRecord {
  symbol: string;
  side: 'BUY' | 'SELL';
  status: string;
  filledQty: number | null;
  totalQty: number | null;
  price: number | null;
  stopPrice: number | null;
  avgPrice: number | null;
  placedTime: Date | null;
  filledTime: Date | null;
  rowIndex: number;
}

/**
 * Risk state at a specific point for audit trail
 */
export interface RiskStateSnapshot {
  tradeId: string;
  tradeOutcome: 'WIN' | 'LOSS' | 'BREAKEVEN' | 'ACTIVE';
  tradePnL: number;
  modeBefore: 'HIGH' | 'LOW';
  modeAfter: 'HIGH' | 'LOW';
  lowWinsProgressBefore: number;
  lowWinsProgressAfter: number;
  equityBefore: number;
  equityAfter: number;
  riskPctApplied: number;
  timestamp: Date;
}

/**
 * Extended Trade with risk annotation
 */
export interface TradeWithRisk extends Trade {
  inferredStop: number | null;
  pendingExit: number | null;
  stopSource: 'user' | 'none';
}
