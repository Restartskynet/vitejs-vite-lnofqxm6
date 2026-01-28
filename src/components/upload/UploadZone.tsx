import { useState, useCallback, useRef } from 'react';
import { cn } from '../../lib/utils';

interface UploadZoneProps {
  onFileSelect: (file: File, content: string) => void;
  isLoading?: boolean;
  accept?: string;
  className?: string;
}

export function UploadZone({ onFileSelect, isLoading = false, accept = '.csv', className }: UploadZoneProps) {
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
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'relative cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-[var(--motion-duration-base)] ease-[var(--motion-ease-standard)]',
        isDragging
          ? 'border-sky-400 bg-sky-500/10 scale-[1.01]'
          : 'border-white/15 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]',
        isLoading && 'pointer-events-none opacity-70',
        className
      )}
    >
      <input ref={inputRef} type="file" accept={accept} onChange={handleInputChange} className="hidden" />

      {isLoading ? (
        <>
          <div className="relative w-full max-w-md mx-auto mb-5 rounded-2xl border border-sky-500/40 bg-sky-500/10 overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(120deg,_transparent,_rgba(56,189,248,0.25),_transparent)] scan-sweep" />
            <div className="relative grid grid-cols-3 gap-3 px-4 py-4 text-xs text-sky-200/80">
              <div>
                <p className="uppercase tracking-[0.2em] text-[9px] text-sky-200/60">Stage</p>
                <p className="text-sm font-semibold text-sky-100">Scanning</p>
              </div>
              <div>
                <p className="uppercase tracking-[0.2em] text-[9px] text-sky-200/60">Step</p>
                <p className="text-sm font-semibold text-sky-100">Validate rows</p>
              </div>
              <div>
                <p className="uppercase tracking-[0.2em] text-[9px] text-sky-200/60">Output</p>
                <p className="text-sm font-semibold text-sky-100">Audit log</p>
              </div>
            </div>
          </div>
          <p className="text-lg font-semibold text-white">Scanning & validating...</p>
          <p className="text-sm text-ink-muted mt-1">Deterministic checks running locally on this device.</p>
        </>
      ) : (
        <>
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg className="w-8 h-8 text-sky-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
