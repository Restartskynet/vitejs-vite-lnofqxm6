import { useState } from 'react';
import type { ImportResultExtended, SkippedRow } from '../../engine/types';
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
  
  // FIX: Safe fallback for skippedRows (may not exist in base ImportResult)
  const skippedRows = result.skippedRows ?? [];
  const hasSkipped = skippedRows.length > 0;
  
  // FIX: Safe fallback for pendingOrders
  const pendingOrders = result.pendingOrders ?? [];
  
  // FIX: Safe fallback for detectedFormat
  const detectedFormat = result.detectedFormat ?? 'unknown';
  
  return (
    <Card className={className}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Import Summary</h3>
          <p className="text-xs text-slate-500">Review before importing</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant={detectedFormat === 'orders-records' ? 'info' : 
                     detectedFormat === 'orders-fills' ? 'success' : 'warning'}
            size="sm"
          >
            {detectedFormat}
          </Badge>
          <Badge 
            variant={result.success ? 'success' : 'danger'} 
            size="md"
          >
            {result.success ? 'Ready to Import' : 'Has Errors'}
          </Badge>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Rows</p>
          <p className="text-xl font-bold text-white">{result.stats.totalRows}</p>
        </div>
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
          <p className="text-[10px] text-emerald-400/80 uppercase tracking-wider">Valid Fills</p>
          <p className="text-xl font-bold text-emerald-400">{result.stats.validFills}</p>
        </div>
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <p className="text-[10px] text-amber-400/80 uppercase tracking-wider">Skipped</p>
          <p className="text-xl font-bold text-amber-400">{result.stats.skippedRows}</p>
        </div>
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <p className="text-[10px] text-blue-400/80 uppercase tracking-wider">Pending Orders</p>
          <p className="text-xl font-bold text-blue-400">{pendingOrders.length}</p>
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
      
      {/* Skipped Rows Section */}
      {hasSkipped && (
        <div className="mb-6">
          <button
            onClick={() => setShowSkipped(!showSkipped)}
            className="flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors"
          >
            <svg 
              className={`w-4 h-4 transition-transform ${showSkipped ? 'rotate-90' : ''}`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            View {skippedRows.length} skipped rows
          </button>
          
          {showSkipped && (
            <div className="mt-3 max-h-48 overflow-y-auto space-y-2">
              {skippedRows.slice(0, 20).map((row, i) => (
                <div key={i} className="p-2 rounded bg-amber-500/10 text-xs">
                  <span className="text-amber-400">Row {row.rowIndex ?? i + 1}:</span>
                  <span className="text-slate-400 ml-2">{row.reasons?.join(', ') || 'Unknown reason'}</span>
                </div>
              ))}
              {skippedRows.length > 20 && (
                <p className="text-xs text-slate-500">...and {skippedRows.length - 20} more</p>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Errors */}
      {hasErrors && (
        <div className="mb-6">
          <p className="text-xs text-red-400 uppercase tracking-wider mb-2">
            Errors ({result.errors.length})
          </p>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {result.errors.slice(0, 5).map((err, i) => (
              <div key={i} className="p-2 rounded bg-red-500/10 text-xs text-red-400">
                {err.row > 0 && `Row ${err.row}: `}{err.message}
                {err.column && <span className="text-red-400/60 ml-1">({err.column})</span>}
              </div>
            ))}
            {result.errors.length > 5 && (
              <p className="text-xs text-red-400/60">...and {result.errors.length - 5} more errors</p>
            )}
          </div>
        </div>
      )}
      
      {/* Warnings */}
      {hasWarnings && (
        <div className="mb-6">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">
            Warnings ({result.warnings.length})
          </p>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {result.warnings.slice(0, 5).map((warn, i) => (
              <div key={i} className="p-2 rounded bg-slate-500/10 text-xs text-slate-400">
                {warn.row > 0 && `Row ${warn.row}: `}{warn.message}
              </div>
            ))}
            {result.warnings.length > 5 && (
              <p className="text-xs text-slate-500">...and {result.warnings.length - 5} more warnings</p>
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