import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button, Input } from '../ui';
import { formatPercent, formatMoney, cn } from '../../lib/utils';
import type { StrategyConfig } from '../../engine/types';

interface StrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (strategy: StrategyConfig) => void;
  strategy: StrategyConfig;
}

export function StrategyModal({ isOpen, onClose, onSave, strategy }: StrategyModalProps) {
  const [highPct, setHighPct] = useState('');
  const [lowPct, setLowPct] = useState('');
  const [winsToRecover, setWinsToRecover] = useState('');
  const [lossesToDrop, setLossesToDrop] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setHighPct((strategy.highModeRiskPct * 100).toString());
      setLowPct((strategy.lowModeRiskPct * 100).toString());
      setWinsToRecover(strategy.winsToRecover.toString());
      setLossesToDrop(strategy.lossesToDrop.toString());
      setErrors({});
    }
  }, [isOpen, strategy]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const high = parseFloat(highPct);
    const low = parseFloat(lowPct);
    const wins = parseInt(winsToRecover);
    const losses = parseInt(lossesToDrop);

    if (isNaN(high) || high <= 0) newErrors.highPct = 'Must be > 0';
    else if (high > 10) newErrors.highPct = 'Max 10%';

    if (isNaN(low) || low <= 0) newErrors.lowPct = 'Must be > 0';
    else if (!isNaN(high) && low > high) newErrors.lowPct = 'Must be ≤ HIGH';

    if (isNaN(wins) || !Number.isInteger(wins)) newErrors.winsToRecover = 'Must be integer';
    else if (wins < 1) newErrors.winsToRecover = 'Min 1';
    else if (wins > 10) newErrors.winsToRecover = 'Max 10';

    if (isNaN(losses) || !Number.isInteger(losses)) newErrors.lossesToDrop = 'Must be integer';
    else if (losses < 1) newErrors.lossesToDrop = 'Min 1';
    else if (losses > 10) newErrors.lossesToDrop = 'Max 10';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    onSave({
      ...strategy,
      highModeRiskPct: parseFloat(highPct) / 100,
      lowModeRiskPct: parseFloat(lowPct) / 100,
      winsToRecover: parseInt(winsToRecover),
      lossesToDrop: parseInt(lossesToDrop),
    });
    onClose();
  };

  const previewEquity = 25000;
  const highRisk = (parseFloat(highPct) || 0) / 100 * previewEquity;
  const lowRisk = (parseFloat(lowPct) || 0) / 100 * previewEquity;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Strategy Parameters" size="md">
      <div className="space-y-4">
        {/* HIGH Mode */}
        <div>
          <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">
            HIGH Mode Risk %
          </label>
          <div className="relative">
            <input
              type="number"
              value={highPct}
              onChange={(e) => setHighPct(e.target.value)}
              placeholder="3"
              step="0.1"
              min="0.01"
              max="10"
              className={cn(
                'w-full h-11 pl-3 pr-8 rounded-xl bg-white/[0.05] border text-white font-medium placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60',
                errors.highPct ? 'border-red-500' : 'border-white/10'
              )}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
          </div>
          {errors.highPct && <p className="text-xs text-red-400 mt-1">{errors.highPct}</p>}
        </div>

        {/* LOW Mode */}
        <div>
          <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">
            LOW Mode Risk %
          </label>
          <div className="relative">
            <input
              type="number"
              value={lowPct}
              onChange={(e) => setLowPct(e.target.value)}
              placeholder="0.1"
              step="0.01"
              min="0.01"
              max="10"
              className={cn(
                'w-full h-11 pl-3 pr-8 rounded-xl bg-white/[0.05] border text-white font-medium placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60',
                errors.lowPct ? 'border-red-500' : 'border-white/10'
              )}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
          </div>
          {errors.lowPct && <p className="text-xs text-red-400 mt-1">{errors.lowPct}</p>}
        </div>

        {/* Wins to Recover */}
        <div>
          <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">
            Wins to Recover (LOW → HIGH)
          </label>
          <Input
            type="number"
            value={winsToRecover}
            onChange={(e) => setWinsToRecover(e.target.value)}
            placeholder="2"
            min="1"
            max="10"
            className={errors.winsToRecover ? 'border-red-500' : ''}
          />
          {errors.winsToRecover && <p className="text-xs text-red-400 mt-1">{errors.winsToRecover}</p>}
        </div>

        {/* Losses to Drop */}
        <div>
          <label className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">
            Losses to Drop (HIGH → LOW)
          </label>
          <Input
            type="number"
            value={lossesToDrop}
            onChange={(e) => setLossesToDrop(e.target.value)}
            placeholder="1"
            min="1"
            max="10"
            className={errors.lossesToDrop ? 'border-red-500' : ''}
          />
          {errors.lossesToDrop && <p className="text-xs text-red-400 mt-1">{errors.lossesToDrop}</p>}
        </div>

        {/* Preview */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <p className="text-xs text-slate-500 mb-3">Preview (with ${previewEquity.toLocaleString()} equity)</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-[10px] text-emerald-400/70 uppercase tracking-wider">HIGH Mode</p>
              <p className="text-lg font-bold text-emerald-400">{formatMoney(highRisk)}</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-[10px] text-amber-400/70 uppercase tracking-wider">LOW Mode</p>
              <p className="text-lg font-bold text-amber-400">{formatMoney(lowRisk)}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSubmit} className="flex-1">Save Changes</Button>
        </div>
      </div>
    </Modal>
  );
}