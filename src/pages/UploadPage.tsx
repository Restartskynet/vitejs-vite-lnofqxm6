import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../stores/dashboardStore';
import { Page, Section } from '../components/layout';
import { Card, Button } from '../components/ui';
import { UploadZone, CSVPreview, ImportSummary } from '../components/upload';
import { previewCSV, parseWebullCSV } from '../engine/webullParser';
import type { CSVPreview as CSVPreviewData, ImportResult } from '../engine/types';

type UploadStep = 'upload' | 'preview' | 'confirm';

export function UploadPage() {
  const navigate = useNavigate();
  const { state, actions } = useDashboard();
  const [step, setStep] = useState<UploadStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [preview, setPreview] = useState<CSVPreviewData | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = useCallback((selectedFile: File, content: string) => {
    setFile(selectedFile);
    setFileContent(content);
    
    // Generate preview
    const previewData = previewCSV(content);
    setPreview(previewData);
    setStep('preview');
  }, []);

  const handlePreviewContinue = useCallback(() => {
    if (!fileContent) return;
    
    setIsProcessing(true);
    
    // Parse the CSV (slightly delayed to show loading state)
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
    
    // Import fills into store
    actions.importFills(importResult.fills, {
      fileName: file.name,
      importedAt: new Date(),
      rowCount: importResult.stats.totalRows,
      fillCount: importResult.stats.validFills,
      dateRange: importResult.stats.dateRange,
    });
    
    // Navigate to dashboard
    setTimeout(() => {
      navigate('/');
    }, 300);
  }, [importResult, file, actions, navigate]);

  const handleReset = useCallback(() => {
    setStep('upload');
    setFile(null);
    setFileContent('');
    setPreview(null);
    setImportResult(null);
    setIsProcessing(false);
  }, []);

  return (
    <Page title="Import Trades" subtitle="Upload your Webull Orders CSV to calculate risk">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {['Upload', 'Preview', 'Confirm'].map((label, i) => {
          const stepNames: UploadStep[] = ['upload', 'preview', 'confirm'];
          const isActive = step === stepNames[i];
          const isPast = stepNames.indexOf(step) > i;
          
          return (
            <div key={label} className="flex items-center">
              {i > 0 && <div className={`w-8 h-px mx-2 ${isPast ? 'bg-blue-500' : 'bg-white/20'}`} />}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                isActive 
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' 
                  : isPast 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                    : 'bg-white/5 text-slate-500 border border-white/10'
              }`}>
                {isPast ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-current/20 text-xs">
                    {i + 1}
                  </span>
                )}
                {label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <Section>
          <UploadZone onFileSelect={handleFileSelect} />
          
          {/* Instructions */}
          <Card className="mt-6">
            <h3 className="text-lg font-semibold text-white mb-4">How to Export from Webull</h3>
            <div className="space-y-4 text-sm text-slate-400">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 text-blue-400 text-xs font-bold">1</div>
                <p>Open the Webull app or website and go to your account</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 text-blue-400 text-xs font-bold">2</div>
                <p>Navigate to <strong className="text-white">Orders</strong> → <strong className="text-white">Order History</strong></p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 text-blue-400 text-xs font-bold">3</div>
                <p>Click the <strong className="text-white">Export</strong> button and select CSV format</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 text-blue-400 text-xs font-bold">4</div>
                <p>Upload the downloaded file here</p>
              </div>
            </div>
          </Card>
        </Section>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && preview && (
        <Section>
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

      {/* Step 3: Confirm */}
      {step === 'confirm' && importResult && (
        <Section>
          <ImportSummary 
            result={importResult}
            onConfirm={handleImport}
            onCancel={handleReset}
            isProcessing={isProcessing}
          />
        </Section>
      )}

      {/* Already has data notice */}
      {state.hasData && step === 'upload' && (
        <Card className="mt-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-amber-400">You already have data imported</p>
              <p className="text-xs text-slate-500 mt-1">
                Importing a new CSV will replace your existing data. 
                Current: {state.fills.length} fills, {state.trades.length} trades
              </p>
            </div>
          </div>
        </Card>
      )}
    </Page>
  );
}