import { useState, useRef } from 'react';
import { Button, Badge } from '../ui';
import { Modal } from '../ui/Modal';
import { toETDateKey } from '../../lib/dateKey';
import type { PersistedFill, PersistedData, PersistedAdjustment, ImportHistoryEntry, Settings, PersistedPendingOrder } from '../../types';
import { CURRENT_SCHEMA_VERSION } from '../../types';

interface BackupRestoreProps {
  fills: PersistedFill[];
  settings: Settings;
  importHistory: ImportHistoryEntry[];
  adjustments: PersistedAdjustment[];
  pendingOrders: PersistedPendingOrder[];
  onImport: (data: PersistedData, mode: 'replace' | 'merge') => void;
}

export function BackupRestore({ fills, settings, importHistory, adjustments, pendingOrders, onImport }: BackupRestoreProps) {
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('merge');
  const [importData, setImportData] = useState<PersistedData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const backup: PersistedData & { exportedAt: string } = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      fills,
      fillFingerprints: fills.map(f => f.fingerprint),
      settings: {
        startingEquity: settings.startingEquity,
        startingDate: settings.startingDate,
        strategyId: settings.strategyId,
        theme: settings.theme,
      },
      importHistory,
      adjustments,
      pendingOrders,
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `restart-backup-${toETDateKey(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        
        // Validate
        if (!data || typeof data !== 'object') {
          setImportError('Invalid backup file');
          return;
        }
        if (typeof data.schemaVersion !== 'number') {
          setImportError('Missing schema version');
          return;
        }
        if (data.schemaVersion > CURRENT_SCHEMA_VERSION) {
          setImportError(`Backup is from newer version (v${data.schemaVersion}). Update the app first.`);
          return;
        }
        if (!Array.isArray(data.fills)) {
          setImportError('Missing fills array');
          return;
        }

        setImportData(data as PersistedData);
        setImportError(null);
        setShowImportModal(true);
      } catch {
        setImportError('Failed to parse backup file');
      }
    };
    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImport = () => {
    if (!importData) return;
    onImport(importData, importMode);
    setShowImportModal(false);
    setImportData(null);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
      />

      <Button variant="secondary" size="sm" onClick={handleExport} icon={
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
      }>
        Export Backup
      </Button>

      <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} icon={
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
      }>
        Import Backup
      </Button>

      {importError && (
        <p className="text-xs text-red-400 mt-2">{importError}</p>
      )}

      <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} title="Import Backup" size="md">
        {importData && (
          <div className="space-y-4">
            {/* Backup Info */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <p className="text-xs text-slate-500 mb-2">Backup Contents</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-400">Fills:</span>
                  <span className="text-white ml-2">{importData.fills.length}</span>
                </div>
                <div>
                  <span className="text-slate-400">Imports:</span>
                  <span className="text-white ml-2">{importData.importHistory.length}</span>
                </div>
                <div>
                  <span className="text-slate-400">Adjustments:</span>
                  <span className="text-white ml-2">{importData.adjustments.length}</span>
                </div>
                <div>
                  <span className="text-slate-400">Version:</span>
                  <span className="text-white ml-2">v{importData.schemaVersion}</span>
                </div>
              </div>
            </div>

            {/* Import Mode */}
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-2">
                Import Mode
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setImportMode('merge')}
                  className={`flex-1 p-3 rounded-lg text-sm font-medium transition-all ${
                    importMode === 'merge'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                      : 'bg-white/5 text-slate-400 border border-white/10'
                  }`}
                >
                  <div className="font-semibold">Merge</div>
                  <div className="text-xs opacity-70 mt-1">Add new, skip duplicates</div>
                </button>
                <button
                  onClick={() => setImportMode('replace')}
                  className={`flex-1 p-3 rounded-lg text-sm font-medium transition-all ${
                    importMode === 'replace'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-white/5 text-slate-400 border border-white/10'
                  }`}
                >
                  <div className="font-semibold">Replace</div>
                  <div className="text-xs opacity-70 mt-1">Clear all, use backup</div>
                </button>
              </div>
            </div>

            {importMode === 'replace' && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <p className="text-xs text-amber-400">
                  ⚠️ Replace mode will delete all existing data before importing.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowImportModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleImport} className="flex-1">
                Import
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
