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

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large (max 10MB)');
      return;
    }
    
    try {
      const content = await file.text();
      onFileSelect(file, content);
    } catch (err) {
      setError('Failed to read file');
    }
  }, [onFileSelect]);

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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input
    if (inputRef.current) inputRef.current.value = '';
  }, [handleFile]);

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
        'relative cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-200',
        isDragging
          ? 'border-blue-500 bg-blue-500/10 scale-[1.02]'
          : 'border-white/20 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]',
        isLoading && 'pointer-events-none opacity-60',
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />
      
      {isLoading ? (
        <>
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-white">Processing...</p>
          <p className="text-sm text-slate-400 mt-1">Parsing your CSV file</p>
        </>
      ) : (
        <>
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-white">
            {isDragging ? 'Drop your file here' : 'Drop CSV or click to upload'}
          </p>
          <p className="text-sm text-slate-400 mt-1">Webull Orders Records CSV only</p>
          
          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}