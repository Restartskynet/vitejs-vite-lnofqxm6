import type { ImportResult } from '../../engine/types';
import { Card, Badge, Button } from '../ui';
import { formatDate } from '../../lib/utils';

interface ImportSummaryProps {
  result: ImportResult;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
  className?: string;
}

export function ImportSummary({ result, onConfirm, onCancel, isProcessing, className }: ImportSummaryProps) {
  const hasErrors = result.errors.length > 0;
  const hasWarnings = result.warnings.length > 0;
  
  return (
    <Card className={className}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Import Summary</h3>
          <p className="text-xs text-slate-500">Review before importing</p>
        </div>
        <Badge 
          variant={result.success ? 'success' : 'danger'} 
          size="md"
        >
          {result.success ? 'Ready to Import' : 'Has Errors'}
        </Badge>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Rows</p>
          <p className="text-xl font-bold text-white">{result.stats.totalRows}</p>
        </div>
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
          <p className="text-[10px] text-emerald-400/80 uppercase tracking-wider">Valid Fills</p>
          <p className="text-xl font-bold text-emerald-400">{result.stats.validFills}</p>
        </div>
        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Skipped</p>
          <p className="text-xl font-bold text-slate-400">{result.stats.skippedRows}</p>
        </div>
        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Symbols</p>
          <p className="text-xl font-bold text-white">{result.stats.symbols.length}</p>
        </div>
      </div>
      
      {/* Date Range */}
      {result.stats.dateRange && (
        <div className="mb-6 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <p className="text-xs text-blue-400/80">Date Range</p>
          <p className="text-sm font-medium text-blue-400">
            {formatDate(result.stats.dateRange.start)} — {formatDate(result.stats.dateRange.end)}
          </p>
        </div>
      )}
      
      {/* Symbols */}
      {result.stats.symbols.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Symbols Found</p>
          <div className="flex flex-wrap gap-2">
            {result.stats.symbols.slice(0, 20).map(symbol => (
              <Badge key={symbol} variant="neutral" size="sm">{symbol}</Badge>
            ))}
            {result.stats.symbols.length > 20 && (
              <Badge variant="neutral" size="sm">+{result.stats.symbols.length - 20} more</Badge>
            )}
          </div>
        </div>
      )}
      
      {/* Errors */}
      {hasErrors && (
        <div className="mb-6">
          <p className="text-xs text-red-400 uppercase tracking-wider mb-2">
            Errors ({result.errors.length})
          </p>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {result.errors.slice(0, 10).map((err, i) => (
              <div key={i} className="p-2 rounded bg-red-500/10 text-xs text-red-400">
                Row {err.row}: {err.message} {err.value && `(${err.value})`}
              </div>
            ))}
            {result.errors.length > 10 && (
              <p className="text-xs text-red-400/60">...and {result.errors.length - 10} more errors</p>
            )}
          </div>
        </div>
      )}
      
      {/* Warnings */}
      {hasWarnings && (
        <div className="mb-6">
          <p className="text-xs text-amber-400 uppercase tracking-wider mb-2">
            Warnings ({result.warnings.length})
          </p>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {result.warnings.slice(0, 5).map((warn, i) => (
              <div key={i} className="p-2 rounded bg-amber-500/10 text-xs text-amber-400">
                Row {warn.row}: {warn.message}
              </div>
            ))}
            {result.warnings.length > 5 && (
              <p className="text-xs text-amber-400/60">...and {result.warnings.length - 5} more warnings</p>
            )}
          </div>
        </div>
      )}
      
      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-white/10">
        <Button variant="secondary" onClick={onCancel} disabled={isProcessing}>
          Cancel
        </Button>
        <Button 
          onClick={onConfirm} 
          disabled={!result.success || isProcessing}
          loading={isProcessing}
          className="flex-1"
        >
          Import {result.stats.validFills} Fills
        </Button>
      </div>
    </Card>
  );
}