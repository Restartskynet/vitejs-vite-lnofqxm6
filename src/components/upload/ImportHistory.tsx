import type { ImportHistoryEntry } from '../../types/importHistory';
import { Card, Badge, Button } from '../ui';
import { formatDateTime, cn } from '../../lib/utils';

interface ImportHistoryProps {
  history: ImportHistoryEntry[];
  onClearHistory?: () => void;
  className?: string;
  compact?: boolean;
}

export function ImportHistory({ history, onClearHistory, className, compact = false }: ImportHistoryProps) {
  if (history.length === 0) {
    return (
      <Card className={className}>
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center">
            <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <p className="text-sm text-slate-500">No import history yet</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Import History</h3>
          <p className="text-xs text-slate-500">{history.length} import(s)</p>
        </div>
        {onClearHistory && (
          <Button variant="ghost" size="sm" onClick={onClearHistory}>
            Clear History
          </Button>
        )}
      </div>

      <div className={cn('space-y-3', compact && 'max-h-64 overflow-y-auto')}>
        {history.map((entry) => (
          <div
            key={entry.id}
            className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-white truncate">{entry.fileName}</p>
                  <Badge
                    variant={entry.mode === 'merge' ? 'info' : 'warning'}
                    size="sm"
                  >
                    {entry.mode}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">
                  {formatDateTime(entry.importedAt)}
                </p>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded bg-white/[0.02]">
                <p className="text-slate-500">Total Rows</p>
                <p className="text-white font-medium">{entry.stats.totalRows}</p>
              </div>
              <div className="p-2 rounded bg-emerald-500/10">
                <p className="text-emerald-400/80">Added</p>
                <p className="text-emerald-400 font-medium">{entry.stats.newFillsAdded}</p>
              </div>
              <div className="p-2 rounded bg-amber-500/10">
                <p className="text-amber-400/80">Skipped</p>
                <p className="text-amber-400 font-medium">{entry.stats.duplicatesSkipped}</p>
              </div>
              {entry.stats.warningsCount > 0 && (
                <div className="p-2 rounded bg-red-500/10">
                  <p className="text-red-400/80">Warnings</p>
                  <p className="text-red-400 font-medium">{entry.stats.warningsCount}</p>
                </div>
              )}
            </div>

            {entry.dateRange && !compact && (
              <p className="mt-2 text-xs text-slate-500">
                Date range: {entry.dateRange.start} → {entry.dateRange.end}
              </p>
            )}

            {entry.symbols.length > 0 && !compact && (
              <div className="mt-2 flex flex-wrap gap-1">
                {entry.symbols.slice(0, 5).map((symbol) => (
                  <span
                    key={symbol}
                    className="px-2 py-0.5 rounded text-xs bg-white/[0.05] text-slate-400"
                  >
                    {symbol}
                  </span>
                ))}
                {entry.symbols.length > 5 && (
                  <span className="px-2 py-0.5 rounded text-xs bg-white/[0.05] text-slate-500">
                    +{entry.symbols.length - 5} more
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}