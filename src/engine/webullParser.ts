import type { Fill, ImportResult, ValidationError, ValidationWarning, CSVPreview } from './types';
import { generateFillFingerprint, generateFillId } from '../lib/hash';

// Required columns for Webull Orders CSV (core fields)
// We use a lenient approach - only truly required fields block import
const CORE_REQUIRED_COLUMNS = ['Symbol', 'Side', 'Filled Time'];
const PREFERRED_COLUMNS = ['Filled Qty', 'Avg Price', 'Order No.'];

// Extended column aliases for various Webull export flavors
const COLUMN_ALIASES: Record<string, string[]> = {
  'Symbol': ['Symbol', 'Ticker', 'Stock Symbol', 'SYMBOL', 'Sym'],
  'Side': ['Side', 'Action', 'Buy/Sell', 'SIDE', 'Type', 'Order Side'],
  'Filled Qty': ['Filled Qty', 'Filled Quantity', 'Qty', 'Quantity', 'Shares', 'Filled', 'FILLED', 'Fill Qty', 'Executed Qty'],
  'Avg Price': ['Avg Price', 'Average Price', 'Price', 'Fill Price', 'AVG PRICE', 'Exec Price', 'Filled Price'],
  'Filled Time': ['Filled Time', 'Fill Time', 'Time', 'Date/Time', 'Executed Time', 'FILLED TIME', 'Execution Time', 'Trade Time'],
  'Order No.': ['Order No.', 'Order Number', 'Order ID', 'OrderId', 'ORDER NO', 'Order #', 'Confirmation'],
  'Commission': ['Commission', 'Comm', 'Fee', 'Fees', 'COMMISSION'],
  'Status': ['Status', 'STATUS', 'Order Status', 'Fill Status'],
};

/**
 * Parse CSV text into rows and columns
 */
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
 * Find column index by name or alias (case-insensitive)
 */
function findColumnIndex(headers: string[], targetColumn: string): number {
  const aliases = COLUMN_ALIASES[targetColumn] || [targetColumn];
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
  
  for (const alias of aliases) {
    const normalizedAlias = alias.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const idx = normalizedHeaders.indexOf(normalizedAlias);
    if (idx !== -1) return idx;
  }
  
  // Try partial match as fallback
  for (const alias of aliases) {
    const normalizedAlias = alias.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const idx = normalizedHeaders.findIndex(h => h.includes(normalizedAlias) || normalizedAlias.includes(h));
    if (idx !== -1) return idx;
  }
  
  return -1;
}

/**
 * Parse Webull date format with multiple format support
 */
function parseWebullDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Clean up the string
  const cleaned = dateStr.trim();
  
  // Try multiple formats
  const formats = [
    // "01/22/2026 09:53:04 EST" - Webull standard
    /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/,
    // "2026-01-22 09:53:04" - ISO-ish
    /(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2}):(\d{2})/,
    // "01/22/2026" - Date only
    /(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // "2026-01-22" - ISO date only
    /(\d{4})-(\d{1,2})-(\d{1,2})$/,
  ];
  
  for (const regex of formats) {
    const match = cleaned.match(regex);
    if (match) {
      try {
        let year: number, month: number, day: number;
        let hour = 12, minute = 0, second = 0;
        
        if (match[0].includes('-') && match[1].length === 4) {
          // ISO format: YYYY-MM-DD
          [, year, month, day] = match.map(Number) as [unknown, number, number, number];
          if (match[4]) [hour, minute, second] = [Number(match[4]), Number(match[5]), Number(match[6])];
        } else {
          // US format: MM/DD/YYYY
          [, month, day, year] = match.map(Number) as [unknown, number, number, number];
          if (match[4]) [hour, minute, second] = [Number(match[4]), Number(match[5]), Number(match[6])];
        }
        
        const date = new Date(year, month - 1, day, hour, minute, second);
        if (!isNaN(date.getTime())) return date;
      } catch {
        continue;
      }
    }
  }
  
  // Fallback to Date.parse
  const parsed = Date.parse(cleaned);
  return isNaN(parsed) ? null : new Date(parsed);
}

/**
 * Get market date (YYYY-MM-DD) from a timestamp
 */
function getMarketDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Preview CSV file (first 5 rows)
 */
export function previewCSV(text: string): CSVPreview {
  const rows = parseCSVText(text);
  
  if (rows.length === 0) {
    return {
      headers: [],
      rows: [],
      totalRows: 0,
      hasRequiredColumns: false,
      missingColumns: CORE_REQUIRED_COLUMNS,
    };
  }
  
  const headers = rows[0];
  const dataRows = rows.slice(1, 6); // First 5 data rows
  
  // Check for core required columns only
  const missingColumns: string[] = [];
  for (const col of CORE_REQUIRED_COLUMNS) {
    if (findColumnIndex(headers, col) === -1) {
      missingColumns.push(col);
    }
  }
  
  return {
    headers,
    rows: dataRows,
    totalRows: rows.length - 1,
    hasRequiredColumns: missingColumns.length === 0,
    missingColumns,
  };
}

/**
 * Parse Webull Orders CSV into fills
 * Uses soft-fail approach: parses what it can, warns on issues
 */
export function parseWebullCSV(text: string): ImportResult {
  const rows = parseCSVText(text);
  
  if (rows.length < 2) {
    return {
      success: false,
      fills: [],
      errors: [{ row: 0, column: '', message: 'CSV file is empty or has no data rows', value: '' }],
      warnings: [],
      stats: { totalRows: 0, validFills: 0, skippedRows: 0, dateRange: null, symbols: [] },
    };
  }
  
  const headers = rows[0];
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const fills: Fill[] = [];
  
  // Find column indices
  const colIndices: Record<string, number> = {};
  
  // Check core required columns
  for (const col of CORE_REQUIRED_COLUMNS) {
    const idx = findColumnIndex(headers, col);
    colIndices[col] = idx;
    if (idx === -1) {
      errors.push({ row: 0, column: col, message: `Core required column "${col}" not found`, value: '' });
    }
  }
  
  // Check preferred columns (warn if missing, but continue)
  for (const col of PREFERRED_COLUMNS) {
    const idx = findColumnIndex(headers, col);
    colIndices[col] = idx;
    if (idx === -1) {
      warnings.push({ row: 0, message: `Preferred column "${col}" not found - using defaults` });
    }
  }
  
  // Also check optional columns
  colIndices['Commission'] = findColumnIndex(headers, 'Commission');
  colIndices['Status'] = findColumnIndex(headers, 'Status');
  
  // If core columns missing, fail
  if (errors.length > 0) {
    return {
      success: false,
      fills: [],
      errors,
      warnings,
      stats: { totalRows: rows.length - 1, validFills: 0, skippedRows: rows.length - 1, dateRange: null, symbols: [] },
    };
  }
  
  // Parse each data row
  const symbols = new Set<string>();
  let minDate: Date | null = null;
  let maxDate: Date | null = null;
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1; // 1-indexed for user display
    
    // Skip empty rows
    if (row.every(cell => !cell.trim())) {
      continue;
    }
    
    // Check status if column exists (skip non-filled orders)
    if (colIndices['Status'] >= 0) {
      const status = row[colIndices['Status']]?.trim().toLowerCase();
      if (status && status !== 'filled' && status !== 'partial' && status !== 'partially filled') {
        // Skip non-filled orders silently
        continue;
      }
    }
    
    // Extract values
    const symbol = row[colIndices['Symbol']]?.trim().toUpperCase();
    const sideRaw = row[colIndices['Side']]?.trim().toUpperCase();
    const qtyRaw = colIndices['Filled Qty'] >= 0 ? row[colIndices['Filled Qty']]?.trim() : null;
    const priceRaw = colIndices['Avg Price'] >= 0 ? row[colIndices['Avg Price']]?.trim().replace(/[$,@]/g, '') : null;
    const timeRaw = row[colIndices['Filled Time']]?.trim();
    const orderIdRaw = colIndices['Order No.'] >= 0 ? row[colIndices['Order No.']]?.trim() : '';
    const commissionRaw = colIndices['Commission'] >= 0 ? row[colIndices['Commission']]?.trim().replace(/[$,]/g, '') : '0';
    
    // Validate symbol
    if (!symbol) {
      warnings.push({ row: rowNum, message: 'Missing symbol, row skipped' });
      continue;
    }
    
    // Parse side
    let side: 'BUY' | 'SELL';
    if (sideRaw?.includes('BUY') || sideRaw === 'B') {
      side = 'BUY';
    } else if (sideRaw?.includes('SELL') || sideRaw === 'S') {
      side = 'SELL';
    } else {
      warnings.push({ row: rowNum, message: `Invalid side "${sideRaw}", row skipped` });
      continue;
    }
    
    // Parse quantity (default to 1 if missing)
    let quantity = 1;
    if (qtyRaw) {
      const parsed = parseFloat(qtyRaw.replace(/,/g, ''));
      if (Number.isFinite(parsed) && parsed > 0) {
        quantity = parsed;
      } else {
        warnings.push({ row: rowNum, message: `Invalid quantity "${qtyRaw}", using 1` });
      }
    }
    
    // Parse price (default to 0 if missing - will be flagged)
    let price = 0;
    if (priceRaw) {
      const parsed = parseFloat(priceRaw);
      if (Number.isFinite(parsed) && parsed > 0) {
        price = parsed;
      } else {
        warnings.push({ row: rowNum, message: `Invalid price "${priceRaw}", row skipped` });
        continue;
      }
    } else {
      warnings.push({ row: rowNum, message: 'Missing price, row skipped' });
      continue;
    }
    
    // Parse time
    const filledTime = parseWebullDate(timeRaw || '');
    if (!filledTime) {
      warnings.push({ row: rowNum, message: `Invalid date "${timeRaw}", row skipped` });
      continue;
    }
    
    // Parse commission
    const commission = parseFloat(commissionRaw) || 0;
    
    // Generate fingerprint and ID
    const fingerprint = generateFillFingerprint(symbol, side, quantity, price, filledTime);
    const fillId = generateFillId(fingerprint);
    
    // Create fill
    const fill: Fill = {
      id: fillId,
      symbol,
      side,
      quantity,
      price,
      filledTime,
      orderId: orderIdRaw || '',
      commission: Math.abs(commission),
      marketDate: getMarketDate(filledTime),
    };
    
    // Add fingerprint to fill for later deduplication
    (fill as Fill & { fingerprint: string }).fingerprint = fingerprint;
    
    fills.push(fill);
    symbols.add(symbol);
    
    // Track date range
    if (!minDate || filledTime < minDate) minDate = filledTime;
    if (!maxDate || filledTime > maxDate) maxDate = filledTime;
  }
  
  // Sort fills by time
  fills.sort((a, b) => a.filledTime.getTime() - b.filledTime.getTime());
  
  const dateRange = minDate && maxDate
    ? { start: getMarketDate(minDate), end: getMarketDate(maxDate) }
    : null;
  
  return {
    success: fills.length > 0 || (errors.length === 0 && warnings.length < rows.length - 1),
    fills,
    errors,
    warnings,
    stats: {
      totalRows: rows.length - 1,
      validFills: fills.length,
      skippedRows: rows.length - 1 - fills.length,
      dateRange,
      symbols: Array.from(symbols).sort(),
    },
  };
}