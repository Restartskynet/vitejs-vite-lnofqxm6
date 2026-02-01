import { useState, useCallback, useRef } from 'react';
import { cn } from '../../lib/utils';

interface UploadZoneProps {
  onFileSelect: (file: File, content: string) => void;
  isLoading?: boolean;
  scanStage?: string;
  scanDetail?: string;
  scanPercent?: number;
  accept?: string;
  className?: string;
}

export function UploadZone({
  onFileSelect,
  isLoading = false,
  scanStage = 'Scanning',
  scanDetail = 'Validating rows',
  scanPercent = 0,
  accept = '.csv',
  className,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!file.name.toLowerCase().endsWith('.csv')) {
        setError('Please upload a CSV file');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError('File too large (max 10MB)');
        return;
      }

      const content = await file.text();
      onFileSelect(file, content);
    },
    [onFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) void handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFile(file);
      if (inputRef.current) inputRef.current.value = '';
    },
    [handleFile]
  );

  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload CSV file"
      data-dragging={isDragging}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleClick();
        }
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'upload-zone group relative cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-[var(--motion-duration-base)] ease-[var(--motion-ease-standard)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-low)/0.7)] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
        isDragging
          ? 'border-[rgb(var(--accent-low))] bg-[rgb(var(--accent-low)/0.12)] scale-[1.01] shadow-[0_0_30px_rgb(var(--accent-glow)/0.45)]'
          : 'border-white/15 bg-white/[0.02] hover:border-[rgb(var(--accent-low)/0.5)] hover:bg-white/[0.04] hover:shadow-[0_0_24px_rgb(var(--accent-glow)/0.25)]',
        isLoading && 'pointer-events-none opacity-70',
        className
      )}
    >
      <input ref={inputRef} type="file" accept={accept} onChange={handleInputChange} className="hidden" />

      {isLoading ? (
        <>
          <div className="relative w-full max-w-md mx-auto mb-5 rounded-2xl border border-[rgb(var(--accent-info)/0.4)] bg-[rgb(var(--accent-info)/0.12)] overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(120deg,_transparent,_rgb(var(--accent-info)/0.25),_transparent)] scan-sweep" />
            <div className="relative grid grid-cols-3 gap-3 px-4 py-4 text-xs text-[rgb(var(--accent-info)/0.85)]">
              <div>
                <p className="uppercase tracking-[0.2em] text-[9px] text-[rgb(var(--accent-info)/0.6)]">Stage</p>
                <p className="text-sm font-semibold text-[rgb(var(--accent-info))]">{scanStage}</p>
              </div>
              <div>
                <p className="uppercase tracking-[0.2em] text-[9px] text-[rgb(var(--accent-info)/0.6)]">Step</p>
                <p className="text-sm font-semibold text-[rgb(var(--accent-info))]">{scanDetail}</p>
              </div>
              <div>
                <p className="uppercase tracking-[0.2em] text-[9px] text-[rgb(var(--accent-info)/0.6)]">Output</p>
                <p className="text-sm font-semibold text-[rgb(var(--accent-info))]">{Math.min(scanPercent, 100)}%</p>
              </div>
            </div>
          </div>
          <p className="text-lg font-semibold text-white">Scanning & validating...</p>
          <p className="text-sm text-ink-muted mt-1">Deterministic checks running locally on this device.</p>
        </>
      ) : (
        <>
          <div className="upload-cta-icon upload-cta-breath w-16 h-16 mx-auto mb-4 rounded-2xl bg-[rgb(var(--accent-info)/0.2)] border border-[rgb(var(--accent-info)/0.4)] flex items-center justify-center transition-transform">
            <svg className="w-8 h-8 text-[rgb(var(--accent-info))]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-white">
            {isDragging ? 'Drop your CSV here' : 'Drop CSV or click to upload'}
          </p>
          <p className="text-sm text-ink-muted mt-1">Webull Orders Records CSV only · Max 10MB</p>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
