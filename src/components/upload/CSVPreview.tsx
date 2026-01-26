import type { CSVPreview as CSVPreviewData } from '../../engine/types';
import { Card, Badge } from '../ui';
import { cn } from '../../lib/utils';

interface CSVPreviewProps {
  preview: CSVPreviewData;
  className?: string;
}

export function CSVPreview({ preview, className }: CSVPreviewProps) {
  return (
    <Card className={className}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">CSV Preview</h3>
          <p className="text-xs text-slate-500">{preview.totalRows.toLocaleString()} rows found</p>
        </div>
        <Badge 
          variant={preview.hasRequiredColumns ? 'success' : 'danger'} 
          size="sm"
        >
          {preview.hasRequiredColumns ? 'Valid Format' : 'Missing Columns'}
        </Badge>
      </div>
      
      {!preview.hasRequiredColumns && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <p className="text-sm text-red-400 font-medium">Missing required columns:</p>
          <p className="text-xs text-red-400/80 mt-1">{preview.missingColumns.join(', ')}</p>
        </div>
      )}
      
      <div className="overflow-x-auto -mx-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              {preview.headers.map((header, i) => (
                <th 
                  key={i} 
                  className={cn(
                    'px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap',
                    preview.missingColumns.length === 0 
                      ? 'text-slate-400' 
                      : preview.missingColumns.some(m => 
                          header.toLowerCase().includes(m.toLowerCase().split(' ')[0])
                        ) 
                        ? 'text-emerald-400' 
                        : 'text-slate-500'
                  )}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row, rowIdx) => (
              <tr 
                key={rowIdx} 
                className="border-b border-white/5 hover:bg-white/[0.02]"
              >
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
      </div>
      
      {preview.rows.length < preview.totalRows && (
        <p className="text-xs text-slate-500 mt-4 text-center">
          Showing first {preview.rows.length} of {preview.totalRows.toLocaleString()} rows
        </p>
      )}
    </Card>
  );
}