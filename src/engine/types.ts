// ============================================================================
// ENGINE TYPES - Core data structures for the calculation engine
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
    orderId: string;
    commission: number;
    marketDate: string; // YYYY-MM-DD in ET
  }
  
  /**
   * A completed trade (entry + exit fills matched)
   */
  export interface Trade {
    id: string;
    symbol: string;
    side: 'LONG' | 'SHORT';
    status: 'CLOSED' | 'OPEN';
    
    // Entry
    entryDate: Date;
    entryPrice: number;
    entryFills: Fill[];
    
    // Exit (for closed trades)
    exitDate: Date | null;
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
    
    // Classification
    outcome: 'WIN' | 'LOSS' | 'BREAKEVEN' | 'OPEN';
    
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
    lastTradeOutcome: 'WIN' | 'LOSS' | 'BREAKEVEN' | null;
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