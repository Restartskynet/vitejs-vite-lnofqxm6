import { useState, useEffect, useMemo } from 'react';
import type { ImportResultExtended } from '../../engine/types';
import { buildTrades } from '../../engine/tradesBuilder';
import { Card, Badge, Button } from '../ui';
import { formatDate, formatDateTime } from '../../lib/utils';
import { toETDateKey } from '../../lib/dateKey';

interface ImportSummaryProps {
  result: ImportResultExtended;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
  className?: string;
}

export function ImportSummary({ result, onConfirm, onCancel, isProcessing, className }: ImportSummaryProps) {
  const [showSkipped, setShowSkipped] = useState(false);
  const [skippedSearch, setSkippedSearch] = useState('');

  const hasErrors = result.errors.length > 0;
  const hasWarnings = result.warnings.length > 0;

  const skippedRows = useMemo(() => result.skippedRows ?? [], [result.skippedRows]);
  const hasSkipped = skippedRows.length > 0;

  const pendingOrders = result.pendingOrders ?? [];

  const detectedFormat = result.detectedFormat ?? 'unknown';

  const [reviewAcknowledged, setReviewAcknowledged] = useState(false);

  useEffect(() => {
    setReviewAcknowledged(false);
  }, [result]);

  const reviewWarnings = useMemo(() => {
    const warningsSet = new Set<string>();
    const skippedReasons = skippedRows.flatMap((row) => row.reasons ?? []);

    if (detectedFormat === 'unknown') {
      warningsSet.add('Format could not be identified. Make sure this is a Webull Orders Records CSV.');
    }
    if (result.stats.validFills === 0) {
      warningsSet.add('0 filled rows parsed. The file may be the wrong report type.');
    }
    if (result.stats.symbols.length === 0) {
      warningsSet.add('No symbols detected. Check that the Symbol column is present and populated.');
    }
    if (!result.stats.dateRange) {
      warningsSet.add('No valid filled dates detected. Verify the Filled Time column.');
    }
    if (skippedReasons.some((reason) => reason.toLowerCase().includes('missing symbol'))) {
      warningsSet.add('Some rows are missing symbols.');
    }
    if (skippedReasons.some((reason) => reason.toLowerCase().includes('invalid filled time'))) {
      warningsSet.add('Some rows have invalid or empty dates.');
    }
    if (skippedReasons.some((reason) => reason.toLowerCase().includes('invalid quantity'))) {
      warningsSet.add('Some rows have malformed share quantities.');
    }
    if (skippedReasons.some((reason) => reason.toLowerCase().includes('invalid price'))) {
      warningsSet.add('Some rows have malformed prices.');
    }

    return Array.from(warningsSet);
  }, [detectedFormat, result.stats, skippedRows]);

  const requiresReview = reviewWarnings.length > 0;

  const skippedReasonCounts = skippedRows.reduce<Record<string, number>>((acc, row) => {
    const reasons = row.reasons && row.reasons.length > 0 ? row.reasons : ['Unspecified reason'];
    reasons.forEach((reason) => {
      acc[reason] = (acc[reason] ?? 0) + 1;
    });
    return acc;
  }, {});

  const topSkippedReason = Object.entries(skippedReasonCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0];

  const skippedSummary = hasSkipped
    ? `${skippedRows.length} rows skipped${topSkippedReason ? `: ${topSkippedReason}` : ''}`
    : 'No rows skipped';

  const normalizedSearch = skippedSearch.trim().toLowerCase();

  const skippedRowDetails = useMemo(() => {
    const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
    const aliasSets = {
      symbol: ['Symbol', 'Ticker', 'SYMBOL', 'Stock Symbol', 'Sym'],
      side: ['Side', 'Action', 'Buy/Sell', 'B/S', 'Order Side'],
      status: ['Status', 'STATUS', 'Order Status', 'Fill Status', 'State'],
      filledQty: ['Filled Qty', 'Filled', 'Filled Quantity', 'Qty', 'Quantity', 'Shares', 'Total Qty'],
      price: ['Avg Price', 'Average Price', 'Price', 'Fill Price', 'Avg. Price', 'Execution Price'],
      filledTime: ['Filled Time', 'Fill Time', 'Time', 'Date/Time', 'Executed Time'],
      placedTime: ['Placed Time', 'Order Time', 'Submitted Time', 'Created Time', 'Entry Time'],
    };

    const findValue = (rawData: Record<string, string>, aliases: string[]) => {
      const normalized = new Map<string, string>();
      Object.entries(rawData).forEach(([key, value]) => {
        normalized.set(normalizeKey(key), value);
      });

      for (const alias of aliases) {
        const key = normalizeKey(alias);
        if (normalized.has(key)) {
          return { value: normalized.get(key) ?? '', found: true };
        }
      }

      return { value: '', found: false };
    };

    const formatValue = (value: string) => (value.trim() ? value.trim() : '—');
    const formatFilledQty = (value: string, found: boolean) => {
      if (!found) return '—';
      return value.trim() ? value.trim() : '0';
    };
    const formatTimestamp = (value: string, found: boolean) => {
      if (!found || !value.trim()) return '—';
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? value : formatDateTime(parsed);
    };

    return skippedRows.map((row, index) => {
      const symbol = findValue(row.rawData, aliasSets.symbol);
      const side = findValue(row.rawData, aliasSets.side);
      const status = findValue(row.rawData, aliasSets.status);
      const filledQty = findValue(row.rawData, aliasSets.filledQty);
      const price = findValue(row.rawData, aliasSets.price);
      const filledTime = findValue(row.rawData, aliasSets.filledTime);
      const placedTime = findValue(row.rawData, aliasSets.placedTime);
      const timestampValue = filledTime.found ? filledTime : placedTime;

      return {
        key: `${row.rowIndex}-${index}`,
        rowIndex: row.rowIndex ?? index + 1,
        reasons: row.reasons ?? [],
        symbol: formatValue(symbol.value),
        side: formatValue(side.value),
        status: formatValue(status.value),
        filledQty: formatFilledQty(filledQty.value, filledQty.found),
        price: formatValue(price.value),
        timestamp: formatTimestamp(timestampValue.value, timestampValue.found),
      };
    });
  }, [skippedRows]);

  const filteredSkippedRows = useMemo(() => {
    if (!normalizedSearch) return skippedRowDetails;

    return skippedRowDetails.filter((row) => {
      const reasonText = row.reasons.join(' ').toLowerCase();
      return row.symbol.toLowerCase().includes(normalizedSearch) || reasonText.includes(normalizedSearch);
    });
  }, [normalizedSearch, skippedRowDetails]);

  const handleDownloadReport = () => {
    const tradeResult = buildTrades(result.fills, 0, result.pendingOrders ?? []);
    const report = {
      generatedAt: new Date().toISOString(),
      detectedFormat,
      stats: result.stats,
      parsedFills: result.fills.length,
      constructedTrades: tradeResult.trades.length,
      skippedRows: skippedRows.map((row) => ({
        rowIndex: row.rowIndex,
        reasons: row.reasons,
        rawData: row.rawData,
      })),
      warnings: result.warnings,
      errors: result.errors,
      pendingOrders: pendingOrders,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `import-report-${toETDateKey(new Date())}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className={className}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Import Summary</h3>
          <p className="text-xs text-ink-muted">Audit the import before applying</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={detectedFormat === 'orders-records' ? 'info' : detectedFormat === 'orders-fills' ? 'success' : 'warning'}
            size="sm"
          >
            {detectedFormat}
          </Badge>
          <Badge variant={result.success ? 'success' : 'danger'} size="md">
            {result.success ? 'Ready to Import' : 'Has Errors'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <p className="text-[10px] text-ink-muted uppercase tracking-wider">Total Rows</p>
          <p className="text-xl font-bold text-white">{result.stats.totalRows}</p>
        </div>
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
          <p className="text-[10px] text-emerald-200/80 uppercase tracking-wider">Valid Fills</p>
          <p className="text-xl font-bold text-emerald-200">{result.stats.validFills}</p>
        </div>
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <p className="text-[10px] text-amber-200/80 uppercase tracking-wider">Skipped</p>
          <p className="text-xl font-bold text-amber-200">{result.stats.skippedRows}</p>
        </div>
        <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/30">
          <p className="text-[10px] text-sky-200/80 uppercase tracking-wider">Pending Orders</p>
          <p className="text-xl font-bold text-sky-200">{pendingOrders.length}</p>
        </div>
        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <p className="text-[10px] text-ink-muted uppercase tracking-wider">Symbols</p>
          <p className="text-xl font-bold text-white">{result.stats.symbols.length}</p>
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-white/[0.08] bg-white/[0.03] p-3 text-xs text-ink-muted">
        <p className="text-white font-semibold text-sm mb-1">Diagnostics</p>
        <p>{skippedSummary}</p>
        {Object.keys(skippedReasonCounts).length > 1 && (
          <p className="mt-1 text-[10px] text-ink-muted">
            Reasons tracked: {Object.keys(skippedReasonCounts).slice(0, 3).join(', ')}
            {Object.keys(skippedReasonCounts).length > 3 ? '…' : ''}
          </p>
        )}
      </div>

      {result.stats.dateRange && (
        <div className="mb-6 p-3 rounded-lg bg-sky-500/10 border border-sky-500/30">
          <p className="text-xs text-sky-200/80">Date Range</p>
          <p className="text-sm font-medium text-sky-100">
            {formatDate(result.stats.dateRange.start)} — {formatDate(result.stats.dateRange.end)}
          </p>
        </div>
      )}

      {result.stats.symbols.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-ink-muted uppercase tracking-wider mb-2">Symbols Found</p>
          <div className="flex flex-wrap gap-2">
            {result.stats.symbols.slice(0, 20).map((symbol) => (
              <Badge key={symbol} variant="neutral" size="sm">
                {symbol}
              </Badge>
            ))}
            {result.stats.symbols.length > 20 && (
              <Badge variant="neutral" size="sm">
                +{result.stats.symbols.length - 20} more
              </Badge>
            )}
          </div>
        </div>
      )}

      {hasSkipped && (
        <div className="mb-6">
          <button
            onClick={() => setShowSkipped(!showSkipped)}
            className="flex items-center gap-2 text-sm text-amber-200 hover:text-amber-100 transition-colors"
          >
            <svg className={`w-4 h-4 transition-transform ${showSkipped ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            View {skippedRows.length} skipped rows
          </button>

          {showSkipped && (
            <div className="mt-3 space-y-3">
              <p className="text-xs text-ink-muted">
                Skipped rows include key identifiers to help you locate the original order quickly. Use search to filter by symbol or reason.
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label htmlFor="skipped-search" className="text-xs text-ink-muted">
                  Filter skipped rows
                </label>
                <div className="relative flex-1 min-w-0">
                  <input
                    id="skipped-search"
                    type="text"
                    value={skippedSearch}
                    onChange={(event) => setSkippedSearch(event.target.value)}
                    placeholder="Symbol or reason"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder:text-ink-subtle focus:outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
                {filteredSkippedRows.map((row) => (
                  <div key={row.key} className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge variant="warning" size="sm">Row {row.rowIndex}</Badge>
                      {row.reasons.length > 0 ? (
                        row.reasons.map((reason, reasonIndex) => (
                          <Badge key={`${row.key}-${reasonIndex}`} variant="danger" size="sm" className="normal-case tracking-normal">
                            {reason}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="neutral" size="sm">Unspecified reason</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-ink-muted">
                      <div>
                        <span className="uppercase tracking-wider text-[10px] text-ink-subtle">Symbol</span>
                        <p className="text-white">{row.symbol}</p>
                      </div>
                      <div>
                        <span className="uppercase tracking-wider text-[10px] text-ink-subtle">Side</span>
                        <p className="text-white">{row.side}</p>
                      </div>
                      <div>
                        <span className="uppercase tracking-wider text-[10px] text-ink-subtle">Status</span>
                        <p className="text-white">{row.status}</p>
                      </div>
                      <div>
                        <span className="uppercase tracking-wider text-[10px] text-ink-subtle">Filled Qty</span>
                        <p className="text-white">{row.filledQty}</p>
                      </div>
                      <div>
                        <span className="uppercase tracking-wider text-[10px] text-ink-subtle">Price</span>
                        <p className="text-white">{row.price}</p>
                      </div>
                      <div>
                        <span className="uppercase tracking-wider text-[10px] text-ink-subtle">Timestamp</span>
                        <p className="text-white">{row.timestamp}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredSkippedRows.length === 0 && (
                  <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs text-ink-muted">
                    No skipped rows match "{skippedSearch}".
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {hasErrors && (
        <div className="mb-6">
          <p className="text-xs text-red-300 uppercase tracking-wider mb-2">Errors ({result.errors.length})</p>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {result.errors.slice(0, 5).map((err, i) => (
              <div key={i} className="p-2 rounded bg-red-500/10 text-xs text-red-200">
                {err.row > 0 && `Row ${err.row}: `}
                {err.message}
                {err.column && <span className="text-red-200/60 ml-1">({err.column})</span>}
              </div>
            ))}
            {result.errors.length > 5 && (
              <p className="text-xs text-red-300/60">...and {result.errors.length - 5} more errors</p>
            )}
          </div>
        </div>
      )}

      {hasWarnings && (
        <div className="mb-6">
          <p className="text-xs text-ink-muted uppercase tracking-wider mb-2">Warnings ({result.warnings.length})</p>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {result.warnings.slice(0, 5).map((warn, i) => (
              <div key={i} className="p-2 rounded bg-white/[0.05] text-xs text-ink-muted">
                {warn.row > 0 && `Row ${warn.row}: `}
                {warn.message}
              </div>
            ))}
            {result.warnings.length > 5 && (
              <p className="text-xs text-ink-muted">...and {result.warnings.length - 5} more warnings</p>
            )}
          </div>
        </div>
      )}

      {requiresReview && (
        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-100">
          <p className="text-sm font-semibold text-amber-200 mb-2">Review required before import</p>
          <ul className="list-disc list-inside space-y-1">
            {reviewWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
          <label className="mt-3 flex items-start gap-2 text-xs text-amber-100">
            <span className="relative mt-0.5">
              <input
                type="checkbox"
                checked={reviewAcknowledged}
                onChange={(event) => setReviewAcknowledged(event.target.checked)}
                className="peer sr-only"
              />
              <span className="flex h-4 w-4 items-center justify-center rounded border border-amber-200/60 bg-slate-950/70 text-amber-100 transition-colors peer-checked:border-amber-200 peer-checked:bg-amber-400/20 peer-focus-visible:ring-2 peer-focus-visible:ring-amber-400/70">
                <svg
                  className="h-3 w-3 text-amber-200 opacity-0 transition-opacity peer-checked:opacity-100"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 5.29a1 1 0 01.006 1.414l-7.42 7.454a1 1 0 01-1.42-.004L3.29 9.58a1 1 0 011.42-1.414l3.284 3.296 6.708-6.726a1 1 0 011.412-.004z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </span>
            I reviewed the warnings and want to continue.
          </label>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/10">
        <Button variant="secondary" onClick={handleDownloadReport} disabled={isProcessing}>
          Download Import Report
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={isProcessing}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          disabled={!result.success || isProcessing || (requiresReview && !reviewAcknowledged)}
          loading={isProcessing}
          className="flex-1"
        >
          Import {result.stats.validFills} Fills
        </Button>
      </div>
    </Card>
  );
}
