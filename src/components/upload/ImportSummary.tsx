import { useState, useEffect, useMemo } from 'react';
import type { ImportResultExtended } from '../../engine/types';
import { buildTrades } from '../../engine/tradesBuilder';
import { Card, Badge, Button } from '../ui';
import { formatDate } from '../../lib/utils';

interface ImportSummaryProps {
  result: ImportResultExtended;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
  className?: string;
}

export function ImportSummary({ result, onConfirm, onCancel, isProcessing, className }: ImportSummaryProps) {
  const [showSkipped, setShowSkipped] = useState(false);

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
    link.download = `import-report-${new Date().toISOString().split('T')[0]}.json`;
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
            <div className="mt-3 max-h-48 overflow-y-auto space-y-2">
              {skippedRows.slice(0, 20).map((row, i) => (
                <div key={i} className="p-2 rounded bg-amber-500/10 text-xs">
                  <span className="text-amber-200">Row {row.rowIndex ?? i + 1}:</span>
                  <span className="text-ink-muted ml-2">{row.reasons?.join(', ') || 'Unknown reason'}</span>
                </div>
              ))}
              {skippedRows.length > 20 && <p className="text-xs text-ink-muted">...and {skippedRows.length - 20} more</p>}
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
            <input
              type="checkbox"
              checked={reviewAcknowledged}
              onChange={(event) => setReviewAcknowledged(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-amber-200/60 bg-transparent text-amber-200 focus:ring-2 focus:ring-amber-400/70"
            />
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
