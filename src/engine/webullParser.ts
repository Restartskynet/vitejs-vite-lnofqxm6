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
  'Filled Qty': ['Filled Qty', 'Filled Quantity', 'Qty', 'Quantity', 'Shares'],
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
 * Generate a stable fill ID
 */
function generateFillId(orderId: string, symbol: string, filledTime: Date): string {
  const timeStr = filledTime.toISOString();
  const raw = `${orderId}-${symbol}-${timeStr}`;
  // Simple hash
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `fill_${Math.abs(hash).toString(36)}`;
}

/**
 * Convert a date to market date (US Eastern)
 */
function toMarketDate(date: Date): string {
  // Convert to Eastern Time for market date
  const etOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  const etDate = new Intl.DateTimeFormat('en-CA', etOptions).format(date);
  return etDate; // Returns YYYY-MM-DD
}

/**
 * Parse Webull date/time string
 */
function parseWebullDateTime(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Try various formats Webull uses
  const formats = [
    // "01/24/2026 09:35:22" - US format
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/,
    // "2026-01-24 09:35:22" - ISO-ish format
    /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/,
    // "01/24/2026" - Date only
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (match.length === 7) {
        // Full datetime
        if (format.source.startsWith('^(\\d{4})')) {
          // ISO format: YYYY-MM-DD HH:mm:ss
          return new Date(
            parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]),
            parseInt(match[4]), parseInt(match[5]), parseInt(match[6])
          );
        } else {
          // US format: MM/DD/YYYY HH:mm:ss
          return new Date(
            parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]),
            parseInt(match[4]), parseInt(match[5]), parseInt(match[6])
          );
        }
      } else if (match.length === 4) {
        // Date only: MM/DD/YYYY
        return new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]));
      }
    }
  }
  
  // Fallback to Date.parse
  const parsed = Date.parse(dateStr);
  return isNaN(parsed) ? null : new Date(parsed);
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
    
    // Extract values
    const symbol = row[colIndices['Symbol']]?.trim().toUpperCase();
    const sideRaw = row[colIndices['Side']]?.trim().toUpperCase();
    const qtyRaw = row[colIndices['Filled Qty']]?.trim();
    const priceRaw = row[colIndices['Avg Price']]?.trim().replace(/[$,]/g, '');
    const timeRaw = row[colIndices['Filled Time']]?.trim();
    const orderIdRaw = row[colIndices['Order No.']]?.trim();
    const commissionRaw = commissionIdx >= 0 ? row[commissionIdx]?.trim().replace(/[$,]/g, '') : '0';
    const statusRaw = statusIdx >= 0 ? row[statusIdx]?.trim().toUpperCase() : 'FILLED';
    
    // Skip non-filled orders
    if (statusRaw && statusRaw !== 'FILLED' && statusRaw !== 'PARTIAL') {
      warnings.push({ row: rowNum, message: `Skipped row with status: ${statusRaw}` });
      continue;
    }
    
    // Validate symbol
    if (!symbol) {
      errors.push({ row: rowNum, column: 'Symbol', message: 'Missing symbol', value: '' });
      continue;
    }
    
    // Validate side
    const side = sideRaw === 'BUY' || sideRaw === 'B' ? 'BUY' : sideRaw === 'SELL' || sideRaw === 'S' ? 'SELL' : null;
    if (!side) {
      errors.push({ row: rowNum, column: 'Side', message: 'Invalid side (must be BUY or SELL)', value: sideRaw || '' });
      continue;
    }
    
    // Validate quantity
    const quantity = parseFloat(qtyRaw || '');
    if (isNaN(quantity) || quantity <= 0) {
      errors.push({ row: rowNum, column: 'Filled Qty', message: 'Invalid quantity', value: qtyRaw || '' });
      continue;
    }
    
    // Validate price
    const price = parseFloat(priceRaw || '');
    if (isNaN(price) || price <= 0) {
      errors.push({ row: rowNum, column: 'Avg Price', message: 'Invalid price', value: priceRaw || '' });
      continue;
    }
    
    // Validate time
    const filledTime = parseWebullDateTime(timeRaw || '');
    if (!filledTime) {
      errors.push({ row: rowNum, column: 'Filled Time', message: 'Invalid date/time format', value: timeRaw || '' });
      continue;
    }
    
    // Order ID
    const orderId = orderIdRaw || `auto_${rowNum}`;
    
    // Commission
    const commission = parseFloat(commissionRaw) || 0;
    
    // Generate fill ID
    const id = generateFillId(orderId, symbol, filledTime);
    
    // Create fill
    const fill: Fill = {
      id,
      symbol,
      side,
      quantity,
      price,
      filledTime,
      orderId,
      commission: Math.abs(commission),
      marketDate: toMarketDate(filledTime),
    };
    
    fills.push(fill);
    symbols.add(symbol);
    
    // Track date range
    if (!minDate || filledTime < minDate) minDate = filledTime;
    if (!maxDate || filledTime > maxDate) maxDate = filledTime;
  }
  
  // Sort fills by time
  fills.sort((a, b) => a.filledTime.getTime() - b.filledTime.getTime());
  
  return {
    success: errors.length === 0 && fills.length > 0,
    fills,
    errors,
    warnings,
    stats: {
      totalRows: rows.length - 1,
      validFills: fills.length,
      skippedRows: rows.length - 1 - fills.length,
      dateRange: minDate && maxDate ? {
        start: toMarketDate(minDate),
        end: toMarketDate(maxDate),
      } : null,
      symbols: Array.from(symbols).sort(),
    },
  };
}