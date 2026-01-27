import { Modal } from '../ui/Modal';
import { Button, Badge } from '../ui';

interface SkippedRow {
  rowNumber: number;
  reasons: string[];
  rawData: Record<string, string>;
}

interface SkippedRowsModalProps {
  isOpen: boolean;
  onClose: () => void;
  skippedRows: SkippedRow[];
}

function getSuggestedFix(reason: string): string {
  if (reason.includes('Filled Qty')) return 'Check that the "Filled Qty" or "Filled" column has a valid number';
  if (reason.includes('Avg Price')) return 'Check that the "Avg Price" column has a valid price (no $ or commas)';
  if (reason.includes('Filled Time')) return 'Check that the "Filled Time" column has a valid date/time format';
  if (reason.includes('Status')) return 'Only rows with Status="Filled" are imported. Pending/cancelled orders are skipped.';
  return 'Review the row data for formatting issues';
}

export function SkippedRowsModal({ isOpen, onClose, skippedRows }: SkippedRowsModalProps) {
  const handleDownloadJSON = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      totalSkipped: skippedRows.length,
      rows: skippedRows.map(row => ({
        rowNumber: row.rowNumber,
        reasons: row.reasons,
        suggestedFix: row.reasons.map(getSuggestedFix).join('; '),
        rawData: row.rawData,
      })),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skipped-rows-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSV = () => {
    const headers = ['Row Number', 'Reasons', 'Symbol', 'Side', 'Qty', 'Price', 'Status'];
    const rows = skippedRows.map(row => [
      row.rowNumber,
      row.reasons.join('; '),
      row.rawData['Symbol'] || '',
      row.rawData['Side'] || '',
      row.rawData['Filled Qty'] || row.rawData['Qty'] || '',
      row.rawData['Avg Price'] || row.rawData['Price'] || '',
      row.rawData['Status'] || '',
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skipped-rows-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Skipped Rows" size="lg">
      <div className="space-y-4">
        <p className="text-sm text-slate-400">
          {skippedRows.length} row(s) were skipped during import. Review the issues below.
        </p>

        <div className="max-h-80 overflow-y-auto space-y-3">
          {skippedRows.map((row) => (
            <div key={row.rowNumber} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="warning" size="sm">Row {row.rowNumber}</Badge>
                {row.reasons.map((reason, i) => (
                  <Badge key={i} variant="danger" size="sm">{reason}</Badge>
                ))}
              </div>
              <p className="text-xs text-slate-500 mb-2">
                <strong>Suggested fix:</strong> {row.reasons.map(getSuggestedFix).join(' ')}
              </p>
              <div className="text-xs text-slate-600 font-mono bg-black/20 p-2 rounded overflow-x-auto">
                {Object.entries(row.rawData).slice(0, 6).map(([k, v]) => (
                  <span key={k} className="mr-3">{k}: {v || '(empty)'}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" size="sm" onClick={handleDownloadJSON}>
            Download JSON
          </Button>
          <Button variant="secondary" size="sm" onClick={handleDownloadCSV}>
            Download CSV
          </Button>
          <div className="flex-1" />
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}