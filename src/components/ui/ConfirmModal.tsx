import { useState, useEffect } from 'react';
import { Button } from './button';
import { cn } from '../../lib/utils';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  confirmVariant?: 'primary' | 'danger';
  requireTypedConfirmation?: string;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  confirmVariant = 'primary',
  requireTypedConfirmation,
}: ConfirmModalProps) {
  const [typedValue, setTypedValue] = useState('');
  const [step, setStep] = useState<1 | 2>(1);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setTypedValue('');
      setStep(1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const canConfirm = requireTypedConfirmation
    ? typedValue.toLowerCase() === requireTypedConfirmation.toLowerCase()
    : step === 2;

  const handleFirstClick = () => {
    if (requireTypedConfirmation) {
      // For typed confirmation, just check the value
      if (canConfirm) {
        onConfirm();
      }
    } else {
      // For two-click, advance to step 2
      setStep(2);
    }
  };

  const handleConfirm = () => {
    if (canConfirm) {
      onConfirm();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 p-6 rounded-2xl bg-slate-900 border border-white/10 shadow-2xl">
        {/* Warning Icon */}
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>

        <h3 className="text-xl font-bold text-white text-center mb-2">{title}</h3>
        <p className="text-sm text-slate-400 text-center mb-6">{message}</p>

        {requireTypedConfirmation && (
          <div className="mb-6">
            <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2">
              Type "{requireTypedConfirmation}" to confirm
            </label>
            <input
              type="text"
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500/60"
              placeholder={requireTypedConfirmation}
              autoFocus
            />
          </div>
        )}

        {!requireTypedConfirmation && step === 2 && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <p className="text-sm text-red-400 text-center font-medium">
              Click "{confirmText}" again to confirm this action
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          {requireTypedConfirmation ? (
            <Button
              variant={confirmVariant === 'danger' ? 'danger' : 'primary'}
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="flex-1"
            >
              {confirmText}
            </Button>
          ) : (
            <Button
              variant={step === 2 && confirmVariant === 'danger' ? 'danger' : 'secondary'}
              onClick={step === 1 ? handleFirstClick : handleConfirm}
              className={cn('flex-1', step === 2 && 'animate-pulse')}
            >
              {step === 1 ? confirmText : `Confirm ${confirmText}`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}