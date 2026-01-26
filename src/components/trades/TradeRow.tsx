import type { Trade } from '../../engine/types';
import { Badge } from '../ui';
import { formatMoney, formatDate, formatDateTime, cn } from '../../lib/utils';

interface TradeRowProps {
  trade: Trade;
  isExpanded: boolean;
  onToggle: () => void;
}

export function TradeRow({ trade, isExpanded, onToggle }: TradeRowProps) {
  const outcomeColors = {
    WIN: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    LOSS: 'bg-red-500/15 text-red-400 border-red-500/30',
    BREAKEVEN: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    OPEN: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  };

  const pnlColor = trade.totalPnL > 0 ? 'text-emerald-400' : trade.totalPnL < 0 ? 'text-red-400' : 'text-slate-400';

  return (
    <>
      <tr 
        className={cn(
          'border-b border-white/5 hover:bg-white/[0.02] cursor-pointer transition-colors',
          isExpanded && 'bg-white/[0.02]'
        )}
        onClick={onToggle}
      >
        <td className="p-3">
          <button className="text-slate-500 hover:text-white">
            <svg 
              className={cn('w-4 h-4 transition-transform', isExpanded && 'rotate-90')} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </td>
        <td className="p-3 text-sm text-slate-300 whitespace-nowrap">
          {formatDate(trade.entryDate)}
        </td>
        <td className="p-3">
          <span className="font-semibold text-white">{trade.symbol}</span>
        </td>
        <td className="p-3">
          <Badge variant={trade.side === 'LONG' ? 'success' : 'danger'} size="sm">
            {trade.side}
          </Badge>
        </td>
        <td className="p-3 text-sm text-slate-300 text-right tabular-nums">
          {trade.quantity.toLocaleString()}
        </td>
        <td className="p-3 text-sm text-slate-300 text-right tabular-nums">
          {formatMoney(trade.entryPrice)}
        </td>
        <td className="p-3 text-sm text-right tabular-nums">
          {trade.status === 'CLOSED' && trade.exitPrice !== null ? (
            <span className="text-slate-300">{formatMoney(trade.exitPrice)}</span>
          ) : (
            <span className="text-slate-500">{trade.stopPrice ? formatMoney(trade.stopPrice) : '—'}</span>
          )}
        </td>
        <td className={cn('p-3 text-sm font-semibold text-right tabular-nums', pnlColor)}>
          {trade.totalPnL >= 0 ? '+' : ''}{formatMoney(trade.totalPnL)}
        </td>
        <td className={cn('p-3 text-sm text-right tabular-nums', pnlColor)}>
          {trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
        </td>
        <td className="p-3 text-sm text-slate-400 text-right tabular-nums">
          {trade.riskPercent.toFixed(2)}%
        </td>
        <td className="p-3 text-center">
          <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs border', outcomeColors[trade.outcome])}>
            {trade.outcome}
          </span>
        </td>
      </tr>
      
      {/* Expanded Details */}
      {isExpanded && (
        <tr className="bg-white/[0.01]">
          <td colSpan={11} className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Entry Time</p>
                <p className="text-slate-300">{formatDateTime(trade.entryDate)}</p>
              </div>
              {trade.exitDate && (
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Exit Time</p>
                  <p className="text-slate-300">{formatDateTime(trade.exitDate)}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Risk Amount</p>
                <p className="text-slate-300">{formatMoney(trade.riskUsed)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Commission</p>
                <p className="text-slate-300">{formatMoney(trade.commission)}</p>
              </div>
              {trade.durationMinutes !== null && (
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Duration</p>
                  <p className="text-slate-300">{trade.durationMinutes} minutes</p>
                </div>
              )}
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Entry Fills</p>
                <p className="text-slate-300">{trade.entryFills.length} fill(s)</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Exit Fills</p>
                <p className="text-slate-300">{trade.exitFills.length} fill(s)</p>
              </div>
              {trade.remainingQty > 0 && (
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Remaining</p>
                  <p className="text-blue-400">{trade.remainingQty} shares</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}