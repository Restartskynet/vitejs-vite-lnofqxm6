import { useState, useMemo } from 'react';
import type { CSVPreviewExtended } from '../../engine/types';
import { Card, Badge } from '../ui';
import { cn } from '../../lib/utils';

interface CSVPreviewProps {
  preview: CSVPreviewExtended;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
}

const PAGE_SIZES = [5, 10, 25, 50];

export function CSVPreview({ preview, className }: CSVPreviewProps) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const allRows = useMemo(() => {
    return preview.allRows ?? preview.rows ?? [];
  }, [preview.allRows, preview.rows]);

  const processedRows = useMemo(() => {
    let rows = [...allRows];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      rows = rows.filter((row) => row.some((cell) => cell.toLowerCase().includes(term)));
    }

    if (sortColumn !== null) {
      rows.sort((a, b) => {
        const aVal = a[sortColumn] || '';
        const bVal = b[sortColumn] || '';
        const comparison = aVal.localeCompare(bVal, undefined, { numeric: true });
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return rows;
  }, [allRows, searchTerm, sortColumn, sortDirection]);

  const totalPages = Math.ceil(processedRows.length / pageSize);
  const startIdx = page * pageSize;
  const endIdx = Math.min(startIdx + pageSize, processedRows.length);
  const currentRows = processedRows.slice(startIdx, endIdx);

  const handleSort = (colIdx: number) => {
    if (sortColumn === colIdx) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(colIdx);
      setSortDirection('asc');
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  };

  const detectedFormat = preview.detectedFormat ?? 'unknown';
  const formatConfidence = preview.formatConfidence ?? 'low';

  const formatBadgeVariant =
    detectedFormat === 'orders-records' ? 'info' : detectedFormat === 'orders-fills' ? 'success' : 'warning';

  return (
    <Card className={className}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">CSV Preview</h3>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="text-xs text-ink-muted">{processedRows.length.toLocaleString()} rows</p>
            <Badge variant={formatBadgeVariant} size="sm">
              {detectedFormat === 'orders-records'
                ? 'Orders Records Format'
                : detectedFormat === 'orders-fills'
                  ? 'Orders/Fills Format'
                  : 'Unknown Format'}
            </Badge>
            {formatConfidence && <span className="text-[10px] text-ink-muted">({formatConfidence} confidence)</span>}
            <Badge variant={preview.hasRequiredColumns ? 'success' : 'danger'} size="sm">
              {preview.hasRequiredColumns ? 'Valid' : 'Missing Columns'}
            </Badge>
          </div>
        </div>

        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0);
            }}
            placeholder="Search..."
            className="w-full sm:w-48 px-3 py-1.5 pl-8 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-ink-subtle focus:outline-none focus:border-sky-500/50"
          />
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
      </div>

      {!preview.hasRequiredColumns && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <p className="text-sm text-red-300 font-medium">Missing required columns:</p>
          <p className="text-xs text-red-300/80 mt-1">{preview.missingColumns.join(', ')}</p>
        </div>
      )}

      <div className="overflow-x-auto max-w-full touch-pan-x table-scrollbar">
        <table className="min-w-full w-max text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-4 py-2 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider w-12">#</th>
              {preview.headers.map((header, i) => (
                <th
                  key={i}
                  onClick={() => handleSort(i)}
                  className={cn(
                    'px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-white transition-colors',
                    sortColumn === i ? 'text-sky-300' : 'text-ink-muted'
                  )}
                >
                  <div className="flex items-center gap-1">
                    {header}
                    {sortColumn === i && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentRows.map((row, rowIdx) => (
              <tr key={startIdx + rowIdx} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-2 text-ink-subtle tabular-nums">{startIdx + rowIdx + 1}</td>
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className="px-4 py-2 text-slate-300 whitespace-nowrap max-w-[200px] truncate" title={cell}>
                    {cell || <span className="text-ink-subtle italic">empty</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {currentRows.length === 0 && (
        <div className="py-8 text-center text-ink-muted">
          {searchTerm ? `No rows matching "${searchTerm}"` : 'No data to display'}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <label htmlFor="csv-page-size" className="text-xs text-ink-muted">
            Rows per page:
          </label>
          <div className="relative">
            <select
              id="csv-page-size"
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="appearance-none rounded bg-white/5 border border-white/10 px-2 py-1 pr-6 text-xs text-white focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/30"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M5.75 7.5L10 11.75 14.25 7.5" />
            </svg>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-muted">
            {processedRows.length > 0 ? `${startIdx + 1}-${endIdx} of ${processedRows.length}` : '0 rows'}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(0)}
              disabled={page === 0}
              className="p-1.5 rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 0}
              className="p-1.5 rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 4.5l7.5 7.5-7.5 7.5m6-15l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
