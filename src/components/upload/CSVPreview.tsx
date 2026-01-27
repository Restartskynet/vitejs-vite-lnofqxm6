import { useState, useMemo } from 'react';
import type { CSVPreviewExtended } from '../../engine/types';
import { Card, Badge, Button } from '../ui';
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

  // Filter and sort rows
  const processedRows = useMemo(() => {
    let rows = [...preview.allRows];
    
    // Search filter (search in all columns)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      rows = rows.filter(row => 
        row.some(cell => cell.toLowerCase().includes(term))
      );
    }
    
    // Sort
    if (sortColumn !== null) {
      rows.sort((a, b) => {
        const aVal = a[sortColumn] || '';
        const bVal = b[sortColumn] || '';
        const comparison = aVal.localeCompare(bVal, undefined, { numeric: true });
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }
    
    return rows;
  }, [preview.allRows, searchTerm, sortColumn, sortDirection]);

  const totalPages = Math.ceil(processedRows.length / pageSize);
  const startIdx = page * pageSize;
  const endIdx = Math.min(startIdx + pageSize, processedRows.length);
  const currentRows = processedRows.slice(startIdx, endIdx);

  const handleSort = (colIdx: number) => {
    if (sortColumn === colIdx) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(colIdx);
      setSortDirection('asc');
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0); // Reset to first page
  };

  // Format badge style
  const formatBadgeVariant = preview.detectedFormat === 'orders-records' ? 'info' : 
                             preview.detectedFormat === 'orders-fills' ? 'success' : 'warning';

  return (
    <Card className={className}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">CSV Preview</h3>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-slate-500">
              {processedRows.length.toLocaleString()} rows
            </p>
            <Badge variant={formatBadgeVariant} size="sm">
              {preview.detectedFormat === 'orders-records' ? 'Orders Records Format' :
               preview.detectedFormat === 'orders-fills' ? 'Orders/Fills Format' : 'Unknown Format'}
            </Badge>
            <Badge 
              variant={preview.hasRequiredColumns ? 'success' : 'danger'} 
              size="sm"
            >
              {preview.hasRequiredColumns ? 'Valid' : 'Missing Columns'}
            </Badge>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
            placeholder="Search..."
            className="w-full sm:w-48 px-3 py-1.5 pl-8 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50"
          />
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
      </div>
      
      {/* Missing columns warning */}
      {!preview.hasRequiredColumns && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <p className="text-sm text-red-400 font-medium">Missing required columns:</p>
          <p className="text-xs text-red-400/80 mt-1">{preview.missingColumns.join(', ')}</p>
        </div>
      )}
      
      {/* Table */}
      <div className="overflow-x-auto -mx-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-12">
                #
              </th>
              {preview.headers.map((header, i) => (
                <th 
                  key={i} 
                  onClick={() => handleSort(i)}
                  className={cn(
                    'px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-white transition-colors',
                    sortColumn === i ? 'text-blue-400' : 'text-slate-500'
                  )}
                >
                  <div className="flex items-center gap-1">
                    {header}
                    {sortColumn === i && (
                      <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentRows.map((row, rowIdx) => (
              <tr 
                key={startIdx + rowIdx} 
                className="border-b border-white/5 hover:bg-white/[0.02]"
              >
                <td className="px-4 py-2 text-slate-500 text-xs">
                  {startIdx + rowIdx + 1}
                </td>
                {row.map((cell, cellIdx) => (
                  <td 
                    key={cellIdx} 
                    className="px-4 py-2 text-slate-300 whitespace-nowrap max-w-[200px] truncate"
                    title={cell}
                  >
                    {cell || <span className="text-slate-600">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        
        {currentRows.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            {searchTerm ? 'No rows match your search' : 'No data rows'}
          </div>
        )}
      </div>
      
      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="px-2 py-1 rounded bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-blue-500/50"
          >
            {PAGE_SIZES.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Prev
          </Button>
          
          <span className="text-sm text-slate-400 min-w-[100px] text-center">
            Page {page + 1} of {Math.max(1, totalPages)}
          </span>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Next
          </Button>
        </div>
        
        <div className="text-xs text-slate-500">
          Showing {startIdx + 1}-{endIdx} of {processedRows.length}
        </div>
      </div>
    </Card>
  );
}