import { useState } from 'react';
import { Card, Button, Badge } from '../ui';
import { AdjustmentModal } from './AdjustmentModal';
import { formatMoney, cn } from '../../lib/utils';

interface Adjustment {
  id: string;
  date: string;
  type: 'Deposit' | 'Withdrawal' | 'Fee' | 'Correction';
  amount: number;
  note: string;
}

interface AdjustmentsTableProps {
  adjustments: Adjustment[];
  onAdd: (adjustment: Adjustment) => void;
  onUpdate: (adjustment: Adjustment) => void;
  onDelete: (id: string) => void;
}

export function AdjustmentsTable({ adjustments, onAdd, onUpdate, onDelete }: AdjustmentsTableProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingAdjustment, setEditingAdjustment] = useState<Adjustment | null>(null);

  const handleAdd = () => {
    setEditingAdjustment(null);
    setShowModal(true);
  };

  const handleEdit = (adj: Adjustment) => {
    setEditingAdjustment(adj);
    setShowModal(true);
  };

  const handleSave = (adj: Adjustment) => {
    if (editingAdjustment) {
      onUpdate(adj);
    } else {
      onAdd(adj);
    }
  };

  // Calculate summary
  const totalDeposits = adjustments.filter(a => a.type === 'Deposit').reduce((sum, a) => sum + a.amount, 0);
  const totalWithdrawals = adjustments.filter(a => a.type === 'Withdrawal').reduce((sum, a) => sum + Math.abs(a.amount), 0);
  const totalFees = adjustments.filter(a => a.type === 'Fee').reduce((sum, a) => sum + Math.abs(a.amount), 0);
  const netAdjustment = adjustments.reduce((sum, a) => sum + a.amount, 0);

  const sortedAdjustments = [...adjustments].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Manual Adjustments</h3>
          <p className="text-xs text-slate-500">Track deposits, withdrawals, and fees</p>
        </div>
        <Button size="sm" onClick={handleAdd} icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        }>
          Add
        </Button>
      </div>

      {/* Summary */}
      {adjustments.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Net</p>
            <p className={cn('text-lg font-bold', netAdjustment >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              {netAdjustment >= 0 ? '+' : ''}{formatMoney(netAdjustment)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-[10px] text-emerald-400/70 uppercase tracking-wider">Deposits</p>
            <p className="text-lg font-bold text-emerald-400">+{formatMoney(totalDeposits)}</p>
          </div>
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-[10px] text-red-400/70 uppercase tracking-wider">Withdrawals</p>
            <p className="text-lg font-bold text-red-400">−{formatMoney(totalWithdrawals)}</p>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-[10px] text-amber-400/70 uppercase tracking-wider">Fees</p>
            <p className="text-lg font-bold text-amber-400">−{formatMoney(totalFees)}</p>
          </div>
        </div>
      )}

      {/* Table */}
      {sortedAdjustments.length > 0 ? (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {sortedAdjustments.map((adj) => (
            <div key={adj.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors group">
              <div className="flex items-center gap-3">
                <Badge
                  variant={adj.type === 'Deposit' ? 'success' : adj.type === 'Withdrawal' ? 'danger' : adj.type === 'Fee' ? 'warning' : 'info'}
                  size="sm"
                >
                  {adj.type}
                </Badge>
                <div>
                  <p className={cn('text-sm font-medium', adj.amount >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {adj.amount >= 0 ? '+' : ''}{formatMoney(adj.amount)}
                  </p>
                  <p className="text-xs text-slate-500">{adj.date}{adj.note && ` • ${adj.note}`}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(adj)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                  </svg>
                </button>
                <button onClick={() => onDelete(adj.id)} className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500">
          <p className="text-sm">No adjustments yet</p>
          <p className="text-xs mt-1">Add deposits, withdrawals, or fees to track account equity</p>
        </div>
      )}

      <AdjustmentModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        adjustment={editingAdjustment}
      />
    </Card>
  );
}