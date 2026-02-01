import type { 
  Fill, 
  ImportResult, 
  ValidationError, 
  ValidationWarning, 
  CSVPreview,
  WebullCSVFormat,
  CSVPreviewExtended,
  ImportResultExtended,
  SkippedRow,
  PendingOrder
} from './types';
import { generateFillFingerprint, generateFillId } from '../lib/hash';
import { epochDayToIso, isoToEpochDay, normalizeDateKey, toETDateKey } from '../lib/dateKey';

// ============================================================================
// COLUMN ALIASES FOR MULTI-FORMAT SUPPORT
// ============================================================================

/**
 * Extended column aliases for various Webull export flavors:
 * - Orders Records: Name, Symbol, Side, Status, Filled, Total Qty, Price, Avg Price, Time-in-Force, Placed Time, Filled Time
 * - Orders/Fills: Symbol, Side, Status, Filled Qty, Avg Price, Filled Time, Order No., Commission
 */
const COLUMN_ALIASES: Record<string, string[]> = {
  // Symbol - universal
  'Symbol': ['Symbol', 'Ticker', 'Stock Symbol', 'SYMBOL', 'Sym', 'Stock'],
  
  // Side
  'Side': ['Side', 'Action', 'Buy/Sell', 'SIDE', 'Type', 'Order Side', 'B/S'],
  
  // Quantity - CRITICAL: "Filled" is the key column in Orders Records
  'Filled Qty': [
    'Filled Qty', 'Filled Quantity', 'Qty', 'Quantity', 'Shares', 
    'Filled', 'FILLED', 'Fill Qty', 'Executed Qty', 'Exec Qty',
    'Filled Shares', 'Total Filled'
  ],
  
  // Total Quantity (for reference, not always needed)
  'Total Qty': ['Total Qty', 'Total Quantity', 'Order Qty', 'Order Quantity', 'Ordered'],
  
  // Price
  'Avg Price': [
    'Avg Price', 'Average Price', 'Price', 'Fill Price', 'AVG PRICE', 
    'Exec Price', 'Filled Price', 'Avg. Price', 'AvgPrice', 'Execution Price'
  ],

  // Pending Order Price (Orders Records)
  'Price': ['Price', 'Order Price', 'Order Price (USD)'],
  
  // Time
  'Filled Time': [
    'Filled Time', 'Fill Time', 'Time', 'Date/Time', 'Executed Time', 
    'FILLED TIME', 'Execution Time', 'Trade Time', 'Exec Time'
  ],
  
  // Placed Time (for pending order inference)
  'Placed Time': [
    'Placed Time', 'Order Time', 'Submitted Time', 'Created Time', 
    'Entry Time', 'Placed'
  ],
  
  // Order ID - OPTIONAL
  'Order No.': [
    'Order No.', 'Order Number', 'Order ID', 'OrderId', 'ORDER NO', 
    'Order #', 'Confirmation', 'Confirm #', 'Order No'
  ],
  
  // Commission
  'Commission': ['Commission', 'Comm', 'Fee', 'Fees', 'COMMISSION', 'Comm Fee'],
  
  // Status
  'Status': ['Status', 'STATUS', 'Order Status', 'Fill Status', 'State'],
  
  // Name (for reference)
  'Name': ['Name', 'Company', 'Company Name', 'Description'],
  
  // Time in Force
  'Time-in-Force': ['Time-in-Force', 'TIF', 'Time In Force', 'Duration'],
  
  // Order Type (for stop inference)
  'Order Type': ['Order Type', 'Type', 'OrderType', 'Ord Type'],
  
  // Limit Price (for stop inference)
  'Limit Price': ['Limit Price', 'Limit', 'Target Price'],
  
  // Stop/Trigger Price
  'Stop Price': [
    'Stop Price', 'Stop', 'Trigger Price', 'Stop Trigger', 'Stop/Trigger',
    'Stop Price/Trigger', 'Trail Stop Price', 'Stop Price (USD)'
  ],
};

// Core required columns - import fails without these
const CORE_REQUIRED = ['Symbol', 'Side', 'Filled Time'];

// Columns needed for valid fill - row skipped without these
const FILL_REQUIRED = ['Symbol', 'Side', 'Filled Qty', 'Avg Price', 'Filled Time'];

// ============================================================================
// CSV PARSING
// ============================================================================

function parseCSVText(text: string): string[][] {
  const lines = text.trim().split(/\r?\n/);
  const result: string[][] = [];
  
  for (const line of lines) {
    const row: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current.trim());
    result.push(row);
  }
  
  return result;
}

/**
 * Find column index by name or alias (case-insensitive, special char tolerant)
 */
function findColumnIndex(headers: string[], targetColumn: string): number {
  const aliases = COLUMN_ALIASES[targetColumn] || [targetColumn];
  
  // Normalize function - remove special chars, lowercase
  const normalize = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  
  const normalizedHeaders = headers.map(normalize);
  
  // Exact match first
  for (const alias of aliases) {
    const normalizedAlias = normalize(alias);
    const idx = normalizedHeaders.indexOf(normalizedAlias);
    if (idx !== -1) return idx;
  }
  
  // Partial match fallback
  for (const alias of aliases) {
    const normalizedAlias = normalize(alias);
    const idx = normalizedHeaders.findIndex(h => 
      h.includes(normalizedAlias) || normalizedAlias.includes(h)
    );
    if (idx !== -1) return idx;
  }
  
  return -1;
}

/**
 * Detect CSV format based on headers
 */
function detectFormat(headers: string[]): { format: WebullCSVFormat; confidence: 'high' | 'medium' | 'low' } {
  const hasOrderNo = findColumnIndex(headers, 'Order No.') >= 0;
  const hasCommission = findColumnIndex(headers, 'Commission') >= 0;
  const hasName = findColumnIndex(headers, 'Name') >= 0;
  const hasTotalQty = findColumnIndex(headers, 'Total Qty') >= 0;
  const hasPlacedTime = findColumnIndex(headers, 'Placed Time') >= 0;
  const hasTIF = findColumnIndex(headers, 'Time-in-Force') >= 0;
  
  // Orders/Fills format typically has Order No. and Commission
  if (hasOrderNo && hasCommission) {
    return { format: 'orders-fills', confidence: 'high' };
  }
  
  // Orders Records format has Name, Total Qty, Placed Time, Time-in-Force
  if (hasName && hasTotalQty && hasPlacedTime && hasTIF) {
    return { format: 'orders-records', confidence: 'high' };
  }
  
  // Partial matches
  if (hasName || (hasTotalQty && hasPlacedTime)) {
    return { format: 'orders-records', confidence: 'medium' };
  }
  
  if (hasOrderNo || hasCommission) {
    return { format: 'orders-fills', confidence: 'medium' };
  }
  
  return { format: 'unknown', confidence: 'low' };
}

/**
 * Parse Webull date format with multiple format support
 */
function parseWebullDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  const cleaned = dateStr.trim();
  
  // Webull formats:
  // "01/22/2026 09:53:04 EST"
  // "01/22/2026 09:53:04"
  // "2026-01-22 09:53:04"
  // "01/22/2026"
  
  const patterns = [
    // MM/DD/YYYY HH:MM:SS TZ
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})(?:\s+\w+)?$/,
    // YYYY-MM-DD HH:MM:SS
    /^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2}):(\d{2})$/,
    // MM/DD/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // YYYY-MM-DD
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
  ];
  
  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      try {
        let year: number, month: number, day: number;
        let hour = 9, minute = 30, second = 0; // Default to market open
        
        if (pattern.source.startsWith('^(\\d{4})')) {
          // ISO format
          [, year, month, day] = match.map(Number) as [unknown, number, number, number];
          if (match[4]) {
            hour = Number(match[4]);
            minute = Number(match[5]);
            second = Number(match[6]);
          }
        } else {
          // US format
          [, month, day, year] = match.map(Number) as [unknown, number, number, number];
          if (match[4]) {
            hour = Number(match[4]);
            minute = Number(match[5]);
            second = Number(match[6]);
          }
        }
        
        const date = new Date(year, month - 1, day, hour, minute, second);
        if (!isNaN(date.getTime())) return date;
      } catch {
        continue;
      }
    }
  }
  
  // Fallback
  const parsed = Date.parse(cleaned);
  return isNaN(parsed) ? null : new Date(parsed);
}

function extractDateKey(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const match = raw.match(/\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\/\d{1,2}\/\d{4}/);
  if (!match) return null;
  return normalizeDateKey(match[0]);
}

function parseNumber(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const cleaned = raw.trim();
  if (!cleaned || cleaned === '--') return null;
  const isParenNegative = cleaned.startsWith('(') && cleaned.endsWith(')');
  const normalized = cleaned
    .replace(/[,$@]/g, '')
    .replace(/[()]/g, '')
    .replace(/\s+/g, '');
  if (!normalized) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return isParenNegative ? -Math.abs(value) : value;
}

// ============================================================================
// PREVIEW FUNCTION
// ============================================================================

export function previewCSV(text: string, pageSize: number = 5, page: number = 0): CSVPreviewExtended {
  const rows = parseCSVText(text);
  
  if (rows.length === 0) {
    return {
      headers: [],
      rows: [],
      allRows: [],
      totalRows: 0,
      hasRequiredColumns: false,
      missingColumns: CORE_REQUIRED,
      detectedFormat: 'unknown',
      formatConfidence: 'low',
    };
  }
  
  const headers = rows[0];
  const dataRows = rows.slice(1);
  const totalRows = dataRows.length;
  
  // Detect format
  const { format, confidence } = detectFormat(headers);
  
  // Check required columns
  const missingColumns: string[] = [];
  for (const col of CORE_REQUIRED) {
    if (findColumnIndex(headers, col) === -1) {
      missingColumns.push(col);
    }
  }
  
  // Also check Filled Qty (critical for fills)
  if (findColumnIndex(headers, 'Filled Qty') === -1) {
    // Check if we have it under an alias
    const qtyIdx = findColumnIndex(headers, 'Filled Qty');
    if (qtyIdx === -1) {
      missingColumns.push('Filled Qty (or "Filled")');
    }
  }
  
  // Paginate
  const startIdx = page * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalRows);
  const pageRows = dataRows.slice(startIdx, endIdx);
  
  return {
    headers,
    rows: pageRows,
    allRows: dataRows,
    totalRows,
    hasRequiredColumns: missingColumns.length === 0,
    missingColumns,
    detectedFormat: format,
    formatConfidence: confidence,
  };
}

// ============================================================================
// MAIN PARSE FUNCTION
// ============================================================================

export function parseWebullCSV(text: string): ImportResultExtended {
  const rows = parseCSVText(text);
  
  if (rows.length < 2) {
    return {
      success: false,
      fills: [],
      errors: [{ row: 0, column: '', message: 'CSV file is empty or has no data rows', value: '' }],
      warnings: [],
      stats: { totalRows: 0, validFills: 0, skippedRows: 0, dateRange: null, symbols: [] },
      detectedFormat: 'unknown',
      skippedRows: [],
      pendingOrders: [],
    };
  }
  
  const headers = rows[0];
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const fills: Fill[] = [];
  const skippedRows: SkippedRow[] = [];
  const pendingOrders: PendingOrder[] = [];
  
  // Detect format
  const { format, confidence } = detectFormat(headers);
  warnings.push({ 
    row: 0, 
    message: `Detected format: ${format} (confidence: ${confidence})` 
  });
  
  // Build column index map
  const colIdx: Record<string, number> = {};
  const allColumns = Object.keys(COLUMN_ALIASES);
  
  for (const col of allColumns) {
    colIdx[col] = findColumnIndex(headers, col);
  }
  
  // Check for critical columns
  const criticalMissing: string[] = [];
  for (const col of CORE_REQUIRED) {
    if (colIdx[col] === -1) {
      criticalMissing.push(col);
    }
  }
  
  // Filled Qty is critical
  if (colIdx['Filled Qty'] === -1) {
    criticalMissing.push('Filled Qty');
  }
  
  // Avg Price is critical
  if (colIdx['Avg Price'] === -1) {
    criticalMissing.push('Avg Price');
  }
  
  if (criticalMissing.length > 0) {
    errors.push({
      row: 0,
      column: criticalMissing.join(', '),
      message: `Critical columns missing: ${criticalMissing.join(', ')}. Cannot import.`,
      value: headers.join(', '),
    });
    
    return {
      success: false,
      fills: [],
      errors,
      warnings,
      stats: { totalRows: rows.length - 1, validFills: 0, skippedRows: rows.length - 1, dateRange: null, symbols: [] },
      detectedFormat: format,
      skippedRows: [],
      pendingOrders: [],
    };
  }
  
  // Warn about optional missing columns
  if (colIdx['Order No.'] === -1) {
    warnings.push({ row: 0, message: 'Order No. column not found - will generate deterministic IDs from fill data' });
  }
  if (colIdx['Commission'] === -1) {
    warnings.push({ row: 0, message: 'Commission column not found - assuming $0 commission' });
  }
  
  // Parse data rows
  const symbols = new Set<string>();
  let minEpochDay: number | null = null;
  let maxEpochDay: number | null = null;
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;
    const rowReasons: string[] = [];
    
    // Skip empty rows
    if (row.every(cell => !cell.trim())) {
      continue;
    }
    
    // Build raw data for skipped row tracking
    const rawData: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rawData[h] = row[idx] || '';
    });
    
    // Check status - skip non-filled orders but track them for pending inference
    const statusCol = colIdx['Status'];
    const status = statusCol >= 0 ? row[statusCol]?.trim().toLowerCase() : 'filled';
    
    if (status && status !== 'filled' && status !== 'partial' && status !== 'partially filled') {
      // Track cancelled/pending orders for stop/exit info (do not infer)
      if (status === 'pending' || status === 'working' || status === 'open') {
        const pendingSymbol = row[colIdx['Symbol']]?.trim().toUpperCase();
        const pendingSide = row[colIdx['Side']]?.trim().toUpperCase();
        const limitPrice = parseNumber(row[colIdx['Limit Price']]);
        const stopPrice = parseNumber(row[colIdx['Stop Price']]);
        const avgPrice = parseNumber(row[colIdx['Avg Price']]);
        const orderPrice = colIdx['Price'] >= 0 ? parseNumber(row[colIdx['Price']]) : null;
        const pendingQty = parseNumber(row[colIdx['Total Qty']]) ?? parseNumber(row[colIdx['Filled Qty']]);
        const placedTimeRaw = colIdx['Placed Time'] >= 0 ? row[colIdx['Placed Time']] : null;
        const placedTime = placedTimeRaw ? parseWebullDate(placedTimeRaw) : new Date();
        const orderType = colIdx['Order Type'] >= 0 ? row[colIdx['Order Type']]?.trim().toUpperCase() : 'UNKNOWN';
        const pendingType = orderType?.includes('STOP') ? 'STOP' : 
          orderType?.includes('LIMIT') ? 'LIMIT' : 
          orderType?.includes('MARKET') ? 'MARKET' : 'UNKNOWN';
        const pendingPrice = limitPrice ?? orderPrice ?? avgPrice ?? null;
        
        if (pendingSymbol && pendingSide && placedTime) {
          pendingOrders.push({
            symbol: pendingSymbol,
            side: pendingSide?.includes('BUY') ? 'BUY' : 'SELL',
            price: pendingPrice,
            stopPrice: stopPrice ?? null,
            limitPrice: limitPrice ?? null,
            quantity: pendingQty ?? 0,
            placedTime,
            type: pendingType,
          });
        }
      }
      
      // Skip non-filled rows
      rowReasons.push(`Status="${status}" (not filled)`);
      skippedRows.push({ rowIndex: rowNum, reasons: rowReasons, rawData });
      continue;
    }
    
    // Extract values
    const symbol = row[colIdx['Symbol']]?.trim().toUpperCase();
    const sideRaw = row[colIdx['Side']]?.trim().toUpperCase();
    const qtyRaw = row[colIdx['Filled Qty']]?.trim();
    const priceRaw = row[colIdx['Avg Price']]?.trim();
    const timeRaw = row[colIdx['Filled Time']]?.trim();
    const orderIdRaw = colIdx['Order No.'] >= 0 ? row[colIdx['Order No.']]?.trim() : '';
    const commissionRaw = colIdx['Commission'] >= 0 ? row[colIdx['Commission']]?.trim() : '0';
    
    // Validate symbol
    if (!symbol) {
      rowReasons.push('Missing symbol');
    }
    
    // Validate side
    let side: 'BUY' | 'SELL' | null = null;
    if (sideRaw?.includes('BUY') || sideRaw === 'B') {
      side = 'BUY';
    } else if (sideRaw?.includes('SELL') || sideRaw === 'S') {
      side = 'SELL';
    } else {
      rowReasons.push(`Invalid side: "${sideRaw}"`);
    }
    
    // Validate quantity
    const quantity = parseNumber(qtyRaw);
    if (quantity === null || quantity <= 0) {
      rowReasons.push(`Invalid quantity: "${qtyRaw}"`);
    }
    
    // Validate price
    const price = parseNumber(priceRaw);
    if (price === null || price <= 0) {
      rowReasons.push(`Invalid price: "${priceRaw}"`);
    }
    
    // Validate time
    const filledTime = parseWebullDate(timeRaw || '');
    if (!filledTime) {
      rowReasons.push(`Invalid filled time: "${timeRaw}"`);
    }
    
    // If any critical validation failed, skip row
    if (rowReasons.length > 0) {
      skippedRows.push({ rowIndex: rowNum, reasons: rowReasons, rawData });
      continue;
    }

    if (quantity === null || price === null || !filledTime) {
      skippedRows.push({ rowIndex: rowNum, reasons: ['Missing required numeric values'], rawData });
      continue;
    }
    
    // Parse commission (optional)
    const commission = Math.abs(parseNumber(commissionRaw) ?? 0);
    const stopPrice = parseNumber(colIdx['Stop Price'] >= 0 ? row[colIdx['Stop Price']] : null);
    
    // Generate fingerprint for deduplication and orderId
    const fingerprint = generateFillFingerprint(symbol!, side!, quantity, price, filledTime);
    const fillId = generateFillId(fingerprint);
    
    // Use orderId from CSV or generate from fingerprint
    const orderId = orderIdRaw || `auto_${fingerprint.substring(0, 12)}`;
    
    // Create fill
    let marketDate = extractDateKey(timeRaw);
    if (!marketDate) {
      warnings.push({
        row: rowNum,
        message: `Invalid market date in filled time: "${timeRaw}". Falling back to ET date.`,
      });
      marketDate = toETDateKey(filledTime!);
    }

    const fill: Fill & { fingerprint: string } = {
      id: fillId,
      symbol: symbol!,
      side: side!,
      quantity,
      price,
      filledTime: filledTime!,
      orderId,
      commission,
      marketDate,
      rowIndex: i - 1,
      stopPrice: stopPrice ?? null,
      fingerprint,
    };
    
    fills.push(fill);
    symbols.add(symbol!);
    
    // Track date range
    const epochDay = isoToEpochDay(marketDate);
    if (minEpochDay === null || epochDay < minEpochDay) minEpochDay = epochDay;
    if (maxEpochDay === null || epochDay > maxEpochDay) maxEpochDay = epochDay;
  }
  
  // Sort fills by time with stable row order tie-breaker
  fills.sort((a, b) => {
    const timeDiff = a.filledTime.getTime() - b.filledTime.getTime();
    if (timeDiff !== 0) return timeDiff;
    return a.rowIndex - b.rowIndex;
  });
  
  const dateRange = minEpochDay !== null && maxEpochDay !== null
    ? { start: epochDayToIso(minEpochDay), end: epochDayToIso(maxEpochDay) }
    : null;
  
  // Summary warning for skipped rows
  if (skippedRows.length > 0) {
    warnings.push({
      row: 0,
      message: `${skippedRows.length} row(s) skipped during import. Click "View Skipped" for details.`,
    });
  }
  
  return {
    success: fills.length > 0,
    fills,
    errors,
    warnings,
    stats: {
      totalRows: rows.length - 1,
      validFills: fills.length,
      skippedRows: skippedRows.length,
      dateRange,
      symbols: Array.from(symbols).sort(),
    },
    detectedFormat: format,
    skippedRows,
    pendingOrders,
  };
}
