import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../stores/dashboardStore';
import { Page, Section } from '../components/layout';
import { Card, Button, Badge } from '../components/ui';
import { UploadZone, CSVPreview, ImportSummary, ImportHistory } from '../components/upload';
import { previewCSV, parseWebullCSV } from '../engine/webullParser';
import type { CSVPreviewExtended, ImportResultExtended } from '../engine/types';
import { formatDateTime } from '../lib/utils';
import sampleCsv from '../../testdata/valid_small.csv?raw';

type UploadStep = 'upload' | 'preview' | 'confirm';
type ImportMode = 'merge' | 'replace';

export function UploadPage() {
  const navigate = useNavigate();
  const { state, actions } = useDashboard();
  const [step, setStep] = useState<UploadStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [preview, setPreview] = useState<CSVPreviewExtended | null>(null);
  const [importResult, setImportResult] = useState<ImportResultExtended | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>('merge');

  const handleFileSelect = useCallback(
    (selectedFile: File, content: string) => {
      setFile(selectedFile);
      setFileContent(content);

      const previewData = previewCSV(content);
      setPreview(previewData);
      setStep('preview');
    },
    []
  );

  const handleUseSample = useCallback(() => {
    const sampleFile = new File([sampleCsv], 'restart-sample.csv', { type: 'text/csv' });
    handleFileSelect(sampleFile, sampleCsv);
  }, [handleFileSelect]);

  const handlePreviewContinue = useCallback(() => {
    if (!fileContent) return;

    setIsProcessing(true);

    setTimeout(() => {
      const result = parseWebullCSV(fileContent);
      setImportResult(result);
      setStep('confirm');
      setIsProcessing(false);
    }, 500);
  }, [fileContent]);

  const handleImport = useCallback(() => {
    if (!importResult || !importResult.success || !file) return;

    setIsProcessing(true);

    actions.importFills(
      importResult.fills,
      {
        fileName: file.name,
        rowCount: importResult.stats.totalRows,
        fillCount: importResult.stats.validFills,
        dateRange: importResult.stats.dateRange,
      },
      importMode
    );

    setTimeout(() => {
      navigate('/');
    }, 300);
  }, [importResult, file, actions, navigate, importMode]);

  const handleReset = useCallback(() => {
    setStep('upload');
    setFile(null);
    setFileContent('');
    setPreview(null);
    setImportResult(null);
    setIsProcessing(false);
    setImportMode('merge');
  }, []);

  const latestImport = state.importHistory[0];

  return (
    <Page title="Import Trades" subtitle="Local-only CSV import for Restart’s Trading Co-Pilot">
      <div className="flex items-center justify-center gap-2 mb-8">
        {['Upload', 'Preview', 'Confirm'].map((label, i) => {
          const stepNames: UploadStep[] = ['upload', 'preview', 'confirm'];
          const isActive = step === stepNames[i];
          const isPast = stepNames.indexOf(step) > i;

          return (
            <div key={label} className="flex items-center">
              {i > 0 && <div className={`w-8 h-px mx-2 ${isPast ? 'bg-sky-400' : 'bg-white/20'}`} />}
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                  isActive
                    ? 'bg-sky-500/20 text-sky-300 border-sky-400/40'
                    : isPast
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                      : 'bg-white/5 text-ink-muted border-white/10'
                }`}
              >
                {isPast ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-xs">
                    {i + 1}
                  </span>
                )}
                {label}
              </div>
            </div>
          );
        })}
      </div>

      {step === 'upload' && (
        <Section>
          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
            <Card className="flex flex-col gap-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Drop your Webull Orders Records CSV</h3>
                <p className="text-xs text-ink-muted">No uploads, no servers — everything stays on this device.</p>
              </div>
              <UploadZone onFileSelect={handleFileSelect} isLoading={isProcessing} />
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="secondary" onClick={handleUseSample} icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75h9A2.25 2.25 0 0118.75 6v12A2.25 2.25 0 0116.5 20.25h-9A2.25 2.25 0 015.25 18V6A2.25 2.25 0 017.5 3.75z" />
                  </svg>
                }>
                  Try Demo Data
                </Button>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs text-ink-muted">
                <p className="font-semibold text-white text-sm mb-2">Export checklist</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Use the Webull “Orders Records” CSV export.</li>
                  <li>Keep all default columns to preserve audit trail fidelity.</li>
                  <li>No network calls required — import runs entirely on-device.</li>
                </ul>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">Last import</h3>
                  <p className="text-xs text-ink-muted">Quick diagnostics</p>
                </div>
                <Badge variant={latestImport ? 'info' : 'neutral'} size="sm">
                  {latestImport ? 'Recorded' : 'None'}
                </Badge>
              </div>
              {latestImport ? (
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">File</p>
                    <p className="text-white font-medium">{latestImport.fileName}</p>
                    <p className="text-xs text-ink-muted">{formatDateTime(latestImport.importedAt)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-xs text-ink-muted">Rows</p>
                      <p className="text-white font-semibold">{latestImport.stats.totalRows}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-xs text-ink-muted">Added</p>
                      <p className="text-emerald-300 font-semibold">{latestImport.stats.newFillsAdded}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-xs text-ink-muted">Skipped</p>
                      <p className="text-amber-300 font-semibold">{latestImport.stats.duplicatesSkipped}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-xs text-ink-muted">Warnings</p>
                      <p className="text-red-300 font-semibold">{latestImport.stats.warningsCount}</p>
                    </div>
                  </div>
                  <p className="text-xs text-ink-muted">Diagnostics are stored locally for audit trail integrity.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-ink-muted">
                  Import history appears here once you upload your first CSV.
                </div>
              )}
            </Card>
          </div>
        </Section>
      )}

      {step === 'preview' && preview && (
        <Section>
          {state.hasData && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 p-4 rounded-xl border border-amber-400/30 bg-amber-500/10">
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-200">Existing data detected</p>
                <p className="text-xs text-amber-100/70 mt-0.5">
                  You currently have {state.fills.length} fills. Choose how this import should behave.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setImportMode('merge')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    importMode === 'merge'
                      ? 'bg-sky-500/20 text-sky-300 border-sky-400/40'
                      : 'bg-white/5 text-ink-muted border-white/10'
                  }`}
                >
                  Merge
                </button>
                <button
                  onClick={() => setImportMode('replace')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    importMode === 'replace'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                      : 'bg-white/5 text-ink-muted border-white/10'
                  }`}
                >
                  Replace
                </button>
              </div>
            </div>
          )}

          <CSVPreview preview={preview} />

          <div className="flex gap-3 mt-6">
            <Button variant="secondary" onClick={handleReset}>
              Back
            </Button>
            <Button
              onClick={handlePreviewContinue}
              disabled={!preview.hasRequiredColumns || isProcessing}
              loading={isProcessing}
              className="flex-1"
            >
              {preview.hasRequiredColumns ? 'Continue to Validation' : 'Missing Required Columns'}
            </Button>
          </div>
        </Section>
      )}

      {step === 'confirm' && importResult && (
        <Section>
          {state.hasData && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-ink-muted">Import mode:</span>
              <Badge variant={importMode === 'merge' ? 'info' : 'warning'} size="md">
                {importMode === 'merge' ? 'Merge (Add New)' : 'Replace (Clear & Import)'}
              </Badge>
            </div>
          )}

          <ImportSummary result={importResult} onConfirm={handleImport} onCancel={handleReset} isProcessing={isProcessing} />
        </Section>
      )}

      {state.importHistory.length > 0 && step === 'upload' && (
        <Section className="mt-8">
          <ImportHistory history={state.importHistory} />
        </Section>
      )}
    </Page>
  );
}
