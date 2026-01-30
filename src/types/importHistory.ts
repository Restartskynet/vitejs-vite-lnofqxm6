/**
 * Import history record - tracks each import operation
 */
export interface ImportHistoryEntry {
    id: string;
    fileName: string;
    importedAt: string; // ISO date string
    mode: 'merge' | 'replace';
    stats: {
      totalRows: number;
      newFillsAdded: number;
      duplicatesSkipped: number;
      errorsCount: number;
      warningsCount: number;
    };
    dateRange: {
      start: string;
      end: string;
    } | null;
    symbols: string[];
  }
  
  /**
   * Persisted data schema for IndexedDB
   */
export interface PersistedData {
  schemaVersion: number;
  fills: PersistedFill[];
  fillFingerprints: string[]; // For quick dedupe lookup
  settings: PersistedSettings;
  importHistory: ImportHistoryEntry[];
  adjustments: PersistedAdjustment[];
  pendingOrders?: PersistedPendingOrder[];
}
  
  /**
   * Persisted fill (Date converted to ISO string for storage)
   */
  export interface PersistedFill {
    id: string;
    fingerprint: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    filledTime: string; // ISO string
    orderId: string;
    commission: number;
    marketDate: string;
    rowIndex?: number;
    stopPrice?: number | null;
  }
  
  /**
   * Persisted settings
   */
  export interface PersistedSettings {
    startingEquity: number;
    startingDate: string;
    strategyId: string;
    theme: 'dark' | 'light';
  }
  
  /**
   * Persisted adjustment
   */
export interface PersistedAdjustment {
  id: string;
  date: string;
  type: 'Deposit' | 'Withdrawal' | 'Fee' | 'Correction';
  amount: number;
  note: string;
}

/**
 * Persisted pending order (Date converted to ISO string for storage)
 */
export interface PersistedPendingOrder {
  symbol: string;
  side: 'BUY' | 'SELL';
  price: number | null;
  stopPrice: number | null;
  limitPrice: number | null;
  quantity: number;
  placedTime: string;
  type: 'STOP' | 'LIMIT' | 'MARKET' | 'UNKNOWN';
}
  
  /**
   * Current schema version - increment when data structure changes
   */
  export const CURRENT_SCHEMA_VERSION = 1;
