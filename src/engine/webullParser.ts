import type { Fill, ImportResult, ValidationError, ValidationWarning, CSVPreview } from './types';

// Required columns for Webull Orders CSV
const REQUIRED_COLUMNS = [
  'Symbol',
  'Side',
  'Filled Qty',
  'Avg Price',
  'Filled Time',
  'Order No.',
];

const COLUMN_ALIASES: Record<string, string[]> = {
  'Symbol': ['Symbol', 'Ticker', 'Stock Symbol'],
  'Side': ['Side', 'Action', 'Buy/Sell'],
  'Filled Qty': ['Filled Qty', 'Filled Quantity', 'Qty', 'Quantity', 'Shares', 'Filled'],
  'Avg Price': ['Avg Price', 'Average Price', 'Price', 'Fill Price'],
  'Filled Time': ['Filled Time', 'Fill Time', 'Time', 'Date/Time', 'Executed Time'],
  'Order No.': ['Order No.', 'Order Number', 'Order ID', 'OrderId'],
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
 * Find column index by name or alias
 */
function findColumnIndex(headers: string[], targetColumn: string): number {
  const aliases = COLUMN_ALIASES[targetColumn] || [targetColumn];
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  
  for (const alias of aliases) {
    const idx = normalizedHeaders.indexOf(alias.toLowerCase());
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Parse Webull date format: "MM/DD/YYYY HH:MM:SS EST"
 */
function parseWebullDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Try to parse "01/22/2026 09:53:04 EST" format
  const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (!match) return null;
  
  const [, month, day, year, hour, minute, second] = match;
  const parsed = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
  
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Get market date (YYYY-MM-DD) from a timestamp
 */
function getMarketDate(date: Date): string {
  // Simple approach: use local date
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
      missingColumns: REQUIRED_COLUMNS,
    };
  }
  
  const headers = rows[0];
  const dataRows = rows.slice(1, 6); // First 5 data rows
  
  const missingColumns: string[] = [];
  for (const col of REQUIRED_COLUMNS) {
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
  for (const col of REQUIRED_COLUMNS) {
    const idx = findColumnIndex(headers, col);
    if (idx === -1) {
      errors.push({ row: 0, column: col, message: `Required column "${col}" not found`, value: '' });
    }
    colIndices[col] = idx;
  }
  
  // Also check for optional columns
  const commissionIdx = findColumnIndex(headers, 'Commission');
  const statusIdx = findColumnIndex(headers, 'Status');
  
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
    
    // Check status if available - only process "Filled" orders
    if (statusIdx >= 0) {
      const status = row[statusIdx]?.trim().toLowerCase();
      if (status && status !== 'filled') {
        continue; // Skip non-filled orders
      }
    }
    
    // Extract values
    const symbol = row[colIndices['Symbol']]?.trim().toUpperCase();
    const sideRaw = row[colIndices['Side']]?.trim().toUpperCase();
    const qtyRaw = row[colIndices['Filled Qty']]?.trim().replace(/,/g, '');
    const priceRaw = row[colIndices['Avg Price']]?.trim().replace(/[$,@]/g, '');
    const timeRaw = row[colIndices['Filled Time']]?.trim();
    const orderIdRaw = row[colIndices['Order No.']]?.trim();
    const commissionRaw = commissionIdx >= 0 ? row[commissionIdx]?.trim().replace(/[$,]/g, '') : '0';
    
    // Validate symbol
    if (!symbol) {
      warnings.push({ row: rowNum, message: 'Missing symbol, row skipped' });
      continue;
    }
    
    // Parse side
    let side: 'BUY' | 'SELL';
    if (sideRaw?.includes('BUY')) {
      side = 'BUY';
    } else if (sideRaw?.includes('SELL')) {
      side = 'SELL';
    } else {
      warnings.push({ row: rowNum, message: `Invalid side "${sideRaw}", row skipped` });
      continue;
    }
    
    // Parse quantity
    const quantity = parseFloat(qtyRaw);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      warnings.push({ row: rowNum, message: `Invalid quantity "${qtyRaw}", row skipped` });
      continue;
    }
    
    // Parse price
    const price = parseFloat(priceRaw);
    if (!Number.isFinite(price) || price <= 0) {
      warnings.push({ row: rowNum, message: `Invalid price "${priceRaw}", row skipped` });
      continue;
    }
    
    // Parse time
    const filledTime = parseWebullDate(timeRaw);
    if (!filledTime) {
      warnings.push({ row: rowNum, message: `Invalid date "${timeRaw}", row skipped` });
      continue;
    }
    
    // Parse commission
    const commission = parseFloat(commissionRaw) || 0;
    
    // Generate fill ID
    const fillId = `${symbol}|${side}|${quantity}|${price.toFixed(6)}|${filledTime.toISOString()}`;
    
    // Create fill
    const fill: Fill = {
      id: fillId,
      symbol,
      side,
      quantity,
      price,
      filledTime,
      orderId: orderIdRaw || '',
      commission,
      marketDate: getMarketDate(filledTime),
    };
    
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
    success: fills.length > 0,
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