import { useMemo } from 'react';
import type { Trade } from '../../engine/types';
import { formatDateTime, formatMoney, formatPercent } from '../../lib/utils';
import { Badge, Card } from '../ui';

type LastTradesPanelProps = {
  trades: Trade[];
};

type TradeOutcome = 'WIN' | 'LOSS' | 'BE';

function getOutcome(trade: Trade): TradeOutcome {
  if (trade.realizedPnL > 0) return 'WIN';
  if (trade.realizedPnL < 0) return 'LOSS';
  return 'BE';
}

export function LastTradesPanel({ trades }: LastTradesPanelProps) {
  const lastClosedTrades = useMemo(() => {
    return trades
      .filter((trade) => trade.status === 'CLOSED' && trade.exitDate)
      .sort((a, b) => (b.exitDate?.getTime() ?? 0) - (a.exitDate?.getTime() ?? 0))
      .slice(0, 5);
  }, [trades]);

  return (
    <Card className="glass-panel motion-safe:animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Last 5 trades</h3>
          <p className="text-xs text-ink-muted">Closed outcomes, newest first</p>
        </div>
        <Badge variant={lastClosedTrades.length > 0 ? 'info' : 'neutral'} size="sm">
          {lastClosedTrades.length} closed
        </Badge>
      </div>
      <div className="mt-4 space-y-3">
        {lastClosedTrades.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-ink-muted">
            No closed trades yet.
          </div>
        ) : (
          lastClosedTrades.map((trade) => {
            const outcome = getOutcome(trade);
            const outcomeVariant = outcome === 'WIN' ? 'success' : outcome === 'LOSS' ? 'danger' : 'neutral';
            return (
              <details key={trade.id} className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold text-white">{trade.symbol}</span>
                      <Badge variant={outcomeVariant} size="sm">
                        {outcome}
                      </Badge>
                      {trade.causedModeSwitch && (
                        <Badge variant="warning" size="sm">
                          MODE SWITCH
                        </Badge>
                      )}
                      <Badge variant="neutral" size="sm">
                        {formatPercent(trade.riskPctAtEntry)}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                      <span>{formatMoney(trade.realizedPnL)}</span>
                      <span>Exit {trade.exitDate ? formatDateTime(trade.exitDate) : '—'}</span>
                    </div>
                  </div>
                </summary>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-ink-muted">
                  <div>
                    <p className="uppercase tracking-[0.2em] text-[10px]">Entry</p>
                    <p className="text-white">{formatDateTime(trade.entryDate)}</p>
                  </div>
                  <div>
                    <p className="uppercase tracking-[0.2em] text-[10px]">Exit</p>
                    <p className="text-white">{trade.exitDate ? formatDateTime(trade.exitDate) : '—'}</p>
                  </div>
                  <div>
                    <p className="uppercase tracking-[0.2em] text-[10px]">Mode at entry</p>
                    <p className="text-white">{trade.modeAtEntry}</p>
                  </div>
                  <div>
                    <p className="uppercase tracking-[0.2em] text-[10px]">Risk $</p>
                    <p className="text-white">{formatMoney(trade.riskDollarsAtEntry)}</p>
                  </div>
                </div>
              </details>
            );
          })
        )}
      </div>
    </Card>
  );
}
