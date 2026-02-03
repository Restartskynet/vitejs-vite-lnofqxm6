import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../stores/dashboardStore';
import { Page, Section } from '../components/layout';
import { Card, Button, Badge } from '../components/ui';
import { UploadZone, CSVPreview, ImportSummary, ImportHistory } from '../components/upload';
import { previewCSV, parseWebullCSV } from '../engine/webullParser';
import type { CSVPreviewExtended, ImportResultExtended } from '../engine/types';
import { formatDateTime } from '../lib/utils';
import sampleHigh from '../../testdata/demo_high_mode.csv?raw';
import sampleLow from '../../testdata/demo_low_mode.csv?raw';

type UploadStep = 'upload' | 'preview' | 'confirm' | 'success';
type ImportMode = 'merge' | 'replace';

type ScanStep = {
  stage: string;
  detail: string;
};

const scanSteps: ScanStep[] = [
  { stage: 'Parsing', detail: 'Reading rows' },
  { stage: 'Validating', detail: 'Checking columns' },
  { stage: 'Reconstructing', detail: 'Building fills' },
  { stage: 'Summarizing', detail: 'Final snapshot' },
];

type BrokerageGuide = {
  value: string;
  label: string;
  steps: string[];
  comingSoon?: boolean;
};

const brokerageGuides: BrokerageGuide[] = [
  {
    value: 'webull',
    label: 'Webull',
    steps: [
      'Open Webull Webtrade on desktop and go to Account → Order History.',
      'Choose Orders Records and export the CSV for the desired date range.',
      'Keep default columns (especially Filled, Avg Price, and Filled Time).',
    ],
  },
  {
    value: 'robinhood',
    label: 'Robinhood',
    steps: [
      'Open Robinhood on web and navigate to Account → Reports & Statements.',
      'Select the “Trades” or “Order History” export (CSV).',
      'Confirm the file includes symbol, side, quantity, price, and timestamps.',
    ],
  },
  {
    value: 'fidelity',
    label: 'Fidelity',
    steps: [
      'Visit Fidelity.com → Accounts & Trade → Statements.',
      'Use the “Trade History” download and export as CSV.',
      'Ensure fills include symbol, side, quantity, price, and execution time.',
    ],
  },
  {
    value: 'schwab',
    label: 'Charles Schwab',
    steps: [
      'Log in to Schwab → Accounts → History.',
      'Filter by Trades and export the CSV.',
      'Verify the export includes side, quantity, price, and execution time.',
    ],
  },
  {
    value: 'etrade',
    label: 'E*TRADE',
    steps: [
      'Go to E*TRADE → Accounts → Transactions.',
      'Filter to Trades and use Download → CSV.',
      'Confirm the file includes symbol, side, shares, price, and time.',
    ],
  },
  {
    value: 'ibkr',
    label: 'Interactive Brokers (coming soon)',
    steps: [],
    comingSoon: true,
  },
  {
    value: 'td',
    label: 'TD Ameritrade (coming soon)',
    steps: [],
    comingSoon: true,
  },
];

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
  const [scanIndex, setScanIndex] = useState(0);
  const [scanPercent, setScanPercent] = useState(0);
  const [selectedBrokerage, setSelectedBrokerage] = useState<string>(brokerageGuides[0]?.value ?? 'webull');
  const timersRef = useRef<number[]>([]);

  const stepNames: UploadStep[] = ['upload', 'preview', 'confirm', 'success'];
  const currentStepIndex = stepNames.indexOf(step);
  const activeBrokerage = useMemo(
    () => brokerageGuides.find((guide) => guide.value === selectedBrokerage) ?? brokerageGuides[0],
    [selectedBrokerage]
  );

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const runScanSequence = useCallback((onComplete: () => void) => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    setIsProcessing(true);
    setScanIndex(0);
    setScanPercent(0);

    scanSteps.forEach((stepItem, index) => {
      const timer = window.setTimeout(() => {
        setScanIndex(index);
        setScanPercent(Math.round(((index + 1) / scanSteps.length) * 100));
      }, index * 420);
      timersRef.current.push(timer);
    });

    const finalTimer = window.setTimeout(() => {
      onComplete();
      setIsProcessing(false);
    }, scanSteps.length * 420 + 200);
    timersRef.current.push(finalTimer);
  }, []);

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

  const handleUseSample = useCallback((sample: string, name: string) => {
    const sampleFile = new File([sample], name, { type: 'text/csv' });
    handleFileSelect(sampleFile, sample);
  }, [handleFileSelect]);

  const handlePreviewContinue = useCallback(() => {
    if (!fileContent) return;

    runScanSequence(() => {
      const result = parseWebullCSV(fileContent);
      setImportResult(result);
      setStep('confirm');
    });
  }, [fileContent, runScanSequence]);

  const handleImport = useCallback(() => {
    if (!importResult || !importResult.success || !file) return;

    runScanSequence(() => {
      actions.importFills(
        importResult.fills,
        importResult.pendingOrders ?? [],
        {
          fileName: file.name,
          rowCount: importResult.stats.totalRows,
          fillCount: importResult.stats.validFills,
          dateRange: importResult.stats.dateRange,
        },
        importMode
      );

      setStep('success');
    });
  }, [importResult, file, actions, importMode, runScanSequence]);

  const handleReset = useCallback(() => {
    setStep('upload');
    setFile(null);
    setFileContent('');
    setPreview(null);
    setImportResult(null);
    setIsProcessing(false);
    setImportMode('merge');
    setScanIndex(0);
    setScanPercent(0);
  }, []);

  const latestImport = state.importHistory[0];
  const scanStage = scanSteps[scanIndex] ?? scanSteps[0];

  return (
    <Page title="Import Trades" subtitle="Local-only CSV import for Restart's Trading Co-Pilot">
      <div className="mb-8">
        <div className="sm:hidden rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-ink-muted">
            <span>Step</span>
            <span>{currentStepIndex + 1} of {stepNames.length}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-[rgb(var(--accent-info))]">
              {['Upload', 'Preview', 'Confirm', 'Success'][currentStepIndex]}
            </p>
            <span className="text-xs text-ink-muted">{scanSteps[currentStepIndex]?.stage ?? 'Review'}</span>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-white/10">
            <div
              className="h-1.5 rounded-full bg-[rgb(var(--accent-info))] transition-all"
              style={{ width: `${((currentStepIndex + 1) / stepNames.length) * 100}%` }}
              aria-current="step"
            />
          </div>
        </div>
        <div className="hidden sm:flex items-center justify-center gap-2">
          {['Upload', 'Preview', 'Confirm', 'Success'].map((label, i) => {
            const isActive = step === stepNames[i];
            const isPast = stepNames.indexOf(step) > i;

            return (
              <div key={label} className="flex items-center">
                {i > 0 && <div className={`w-8 h-px mx-2 ${isPast ? 'bg-[rgb(var(--accent-info))]' : 'bg-white/20'}`} />}
                <div
                  aria-current={isActive ? 'step' : undefined}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                    isActive
                      ? 'bg-[rgb(var(--accent-info)/0.28)] text-[rgb(var(--accent-info))] border-[rgb(var(--accent-info)/0.6)] shadow-[0_0_0_1px_rgb(var(--accent-glow)/0.45),0_0_36px_rgb(var(--accent-glow)/0.4),inset_0_0_22px_rgb(var(--accent-glow)/0.22)]'
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
                  <span className={isActive ? 'text-[rgb(var(--accent-info))]' : undefined}>{label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {step === 'upload' && (
        <Section>
          <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
            <Card className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent-low))] motion-safe:animate-pulse" />
                  Local-first import
                </div>
                <h3 className="text-lg font-semibold text-white">Drop your Webull Orders Records CSV</h3>
                <p className="text-xs text-ink-muted">No uploads, no servers, everything stays on this device.</p>
              </div>
              <UploadZone
                onFileSelect={handleFileSelect}
                isLoading={isProcessing}
                scanStage={scanStage.stage}
                scanDetail={scanStage.detail}
                scanPercent={scanPercent}
              />
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="secondary" onClick={() => handleUseSample(sampleHigh, 'restart-demo-high.csv')}>
                  Demo Data (Ends HIGH)
                </Button>
                <Button variant="secondary" onClick={() => handleUseSample(sampleLow, 'restart-demo-low.csv')}>
                  Demo Data (Ends LOW)
                </Button>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs text-ink-muted">
                <p className="font-semibold text-white text-sm mb-2">Export checklist</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Use the “Orders Records” CSV export.</li>
                  <li>Keep all default columns to preserve audit trail fidelity.</li>
                  <li>No network calls required, import runs entirely on-device.</li>
                </ul>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="brokerage-guide" className="text-xs uppercase tracking-[0.2em] text-ink-muted">
                    Brokerage export guide
                  </label>
                  <div className="relative">
                    <select
                      id="brokerage-guide"
                      value={selectedBrokerage}
                      onChange={(e) => setSelectedBrokerage(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 pr-8 text-sm text-white shadow-sm focus:outline-none focus:border-[rgb(var(--accent-info)/0.6)] focus:ring-2 focus:ring-[rgb(var(--accent-info)/0.35)]"
                    >
                      {brokerageGuides.map((guide) => (
                        <option key={guide.value} value={guide.value} disabled={guide.comingSoon}>
                          {guide.label}
                        </option>
                      ))}
                    </select>
                    <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M5.75 7.5L10 11.75 14.25 7.5" />
                    </svg>
                  </div>
                </div>
                <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  {activeBrokerage?.comingSoon ? (
                    <p className="text-xs text-ink-muted">
                      Export guidance for {activeBrokerage.label.replace(' (coming soon)', '')} is in progress.
                      We'll add step-by-step coverage in a future update.
                    </p>
                  ) : (
                    <ol className="space-y-1 text-xs text-ink-muted list-decimal list-inside">
                      {activeBrokerage?.steps.map((stepText) => (
                        <li key={stepText}>{stepText}</li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">Last import</h3>
                  <p className="text-xs text-ink-muted">Local status</p>
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
                  <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs text-ink-muted">
                    Saved locally · Diagnostics are stored on this device only.
                  </div>
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
                      ? 'bg-[rgb(var(--accent-info)/0.2)] text-[rgb(var(--accent-info))] border-[rgb(var(--accent-info)/0.4)]'
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

          {preview.detectedFormat === 'unknown' && (
            <div className="mb-6 rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-xs text-amber-100">
              This file doesn't look like a Webull Orders Records export yet. Double-check you downloaded the Orders Records
              CSV and kept all default columns before continuing.
            </div>
          )}

          <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-ink-muted">
            Merge mode dedupes identical fills. Importing the same CSV twice will skip duplicates automatically.
          </div>

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

      {step === 'success' && importResult && (
        <Section>
          <Card className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-[rgb(var(--accent-high)/0.2)] border border-[rgb(var(--accent-high)/0.4)] flex items-center justify-center">
              <svg className="w-8 h-8 text-[rgb(var(--accent-high))]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Import complete</h3>
            <p className="text-sm text-ink-muted mb-4">
              {importResult.stats.totalRows} rows imported · Saved locally.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <p className="text-[10px] text-ink-muted uppercase tracking-wider">Rows</p>
                <p className="text-lg font-bold text-white">{importResult.stats.totalRows}</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <p className="text-[10px] text-emerald-200/80 uppercase tracking-wider">Valid</p>
                <p className="text-lg font-bold text-emerald-200">{importResult.stats.validFills}</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <p className="text-[10px] text-amber-200/80 uppercase tracking-wider">Skipped</p>
                <p className="text-lg font-bold text-amber-200">{importResult.stats.skippedRows}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <p className="text-[10px] text-ink-muted uppercase tracking-wider">Symbols</p>
                <p className="text-lg font-bold text-white">{importResult.stats.symbols.length}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate('/')}>Go to Dashboard</Button>
              <Button variant="secondary" onClick={handleReset}>Import another CSV</Button>
            </div>
          </Card>
        </Section>
      )}

      {state.importHistory.length > 0 && step === 'upload' && (
        <Section className="mt-8">
          <details className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <summary className="cursor-pointer text-sm font-semibold text-white">
              Import history ({state.importHistory.length})
            </summary>
            <div className="mt-4">
              <ImportHistory history={state.importHistory} />
            </div>
          </details>
        </Section>
      )}
    </Page>
  );
}
