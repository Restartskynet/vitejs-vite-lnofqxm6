import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button, Input } from '../ui';
import { cn } from '../../lib/utils';

interface Adjustment {
  id: string;
  date: string;
  type: 'Deposit' | 'Withdrawal' | 'Fee' | 'Correction';
  amount: number;
  note: string;
}

interface AdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (adjustment: Adjustment) => void;
  adjustment?: Adjustment | null;
}

const ADJUSTMENT_TYPES = ['Deposit', 'Withdrawal', 'Fee', 'Correction'] as const;

export function AdjustmentModal({ isOpen, onClose, onSave, adjustment }: AdjustmentModalProps) {
  const [date, setDate] = useState('');
  const [type, setType] = useState<typeof ADJUSTMENT_TYPES[number]>('Deposit');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isCredit, setIsCredit] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (adjustment) {
        setDate(adjustment.date);
        setType(adjustment.type);
        setAmount(Math.abs(adjustment.amount).toString());
        setNote(adjustment.note);
        setIsCredit(adjustment.amount >= 0);
      } else {
        setDate(new Date().toISOString().split('T')[0]);
        setType('Deposit');
        setAmount('');
        setNote('');
        setIsCredit(true);
      }
      setErrors({});
    }
  }, [isOpen, adjustment]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!date) newErrors.date = 'Required';
    if (!amount || parseFloat(amount) <= 0) newErrors.amount = 'Must be > 0';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const amountNum = parseFloat(amount);
    let signedAmount: number;

    switch (type) {
      case 'Deposit': signedAmount = amountNum; break;
      case 'Withdrawal': signedAmount = -amountNum; break;
      case 'Fee': signedAmount = -amountNum; break;
      case 'Correction': signedAmount = isCredit ? amountNum : -amountNum; break;
    }

    onSave({
      id: adjustment?.id || `adj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date,
      type,
      amount: signedAmount,
      note,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={adjustment ? 'Edit Adjustment' : 'Add Adjustment'} size="md">
      <div className="space-y-4">
        {/* Date */}
        <div>
          <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">Date</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={errors.date ? 'border-red-500' : ''} />
          {errors.date && <p className="text-xs text-red-400 mt-1">{errors.date}</p>}
        </div>

        {/* Type */}
        <div>
          <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">Type</label>
          <div className="grid grid-cols-4 gap-2">
            {ADJUSTMENT_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  type === t
                    ? t === 'Deposit' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : t === 'Withdrawal' ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                    : t === 'Fee' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                    : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Credit/Debit for Correction */}
        {type === 'Correction' && (
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">Direction</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsCredit(true)}
                className={cn(
                  'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  isCredit ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-white/5 text-slate-400 border border-white/10'
                )}
              >
                Credit (+)
              </button>
              <button
                type="button"
                onClick={() => setIsCredit(false)}
                className={cn(
                  'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  !isCredit ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-white/5 text-slate-400 border border-white/10'
                )}
              >
                Debit (−)
              </button>
            </div>
          </div>
        )}

        {/* Amount */}
        <div>
          <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className={cn(
                'w-full h-11 pl-7 pr-3 rounded-xl bg-white/[0.05] border text-white font-medium placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60',
                errors.amount ? 'border-red-500' : 'border-white/10'
              )}
            />
          </div>
          {errors.amount && <p className="text-xs text-red-400 mt-1">{errors.amount}</p>}
        </div>

        {/* Note */}
        <div>
          <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">Note (optional)</label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g., Monthly deposit" />
        </div>

        {/* Preview */}
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <p className="text-xs text-slate-500 mb-1">Preview</p>
          <p className={cn(
            'text-lg font-bold',
            (type === 'Deposit' || (type === 'Correction' && isCredit)) ? 'text-emerald-400' : 'text-red-400'
          )}>
            {(type === 'Deposit' || (type === 'Correction' && isCredit)) ? '+' : '−'}${parseFloat(amount || '0').toLocaleString()}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSubmit} className="flex-1">{adjustment ? 'Update' : 'Add'}</Button>
        </div>
      </div>
    </Modal>
  );
}