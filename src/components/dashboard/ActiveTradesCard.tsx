import { useEffect, useMemo, useState } from 'react';
import type { StrategyConfig, Trade } from '../../engine/types';
import { applyDailyDirectives } from '../../engine/riskEngine';
import { toETDateKey } from '../../lib/dateKey';
import { cn, formatDateTime, formatMoney, formatPercent } from '../../lib/utils';
import { Badge, Card, Input } from '../ui';

const STORAGE_KEY = 'restart-last-known-prices';

type ActiveTradesCardProps = {
  activeTrades: Trade[];
  allTrades: Trade[];
  startingEquity: number;
  strategy: StrategyConfig;
};

type RiskMode = 'HIGH' | 'LOW';

function loadStoredPrices(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => Number.isFinite(value))
    );
  } catch {
    return {};
  }
}

function isValidPrice(value: string): boolean {
  if (!value.trim()) return false;
  return /^(\d+(\.\d*)?|\.\d+)$/.test(value.trim());
}

export function ActiveTradesCard({ activeTrades, allTrades, startingEquity, strategy }: ActiveTradesCardProps) {
  const [lastKnownPrices, setLastKnownPrices] = useState<Record<string, number>>(() => loadStoredPrices());
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>(() => {
    const stored = loadStoredPrices();
    return Object.fromEntries(Object.entries(stored).map(([key, value]) => [key, value.toString()]));
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lastKnownPrices));
  }, [lastKnownPrices]);

  const todayKey = toETDateKey(new Date());
  const tomorrowKey = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return toETDateKey(tomorrow);
  }, []);

  const projectedModes = useMemo(() => {
    const projections = new Map<string, RiskMode>();
    const now = new Date();
    for (const trade of activeTrades) {
      const lastKnownPrice = lastKnownPrices[trade.id];
      if (!Number.isFinite(lastKnownPrice)) continue;
      const realizedPnL = (lastKnownPrice - trade.entryPrice) * trade.remainingQty;
      const previewTrade: Trade = {
        ...trade,
        status: 'CLOSED',
        exitDate: now,
        exitDayKey: todayKey,
        exitPrice: lastKnownPrice,
        remainingQty: 0,
        realizedPnL,
        unrealizedPnL: 0,
        totalPnL: realizedPnL,
        outcome: realizedPnL > 0 ? 'WIN' : realizedPnL < 0 ? 'LOSS' : 'BREAKEVEN',
      };
      const previewTrades = allTrades.map((item) => (item.id === trade.id ? previewTrade : item));
      const { directives } = applyDailyDirectives(previewTrades, startingEquity, strategy, tomorrowKey);
      const tomorrowDirective = directives.find((directive) => directive.date === tomorrowKey) ?? directives[directives.length - 1];
      if (tomorrowDirective) {
        projections.set(trade.id, tomorrowDirective.mode);
      }
    }
    return projections;
  }, [activeTrades, allTrades, lastKnownPrices, startingEquity, strategy, todayKey, tomorrowKey]);

  const handlePriceChange = (tradeId: string, value: string) => {
    setPriceInputs((prev) => ({ ...prev, [tradeId]: value }));
    if (!value.trim()) {
      setLastKnownPrices((prev) => {
        const next = { ...prev };
        delete next[tradeId];
        return next;
      });
      return;
    }
    if (isValidPrice(value)) {
      const nextValue = Number.parseFloat(value);
      if (Number.isFinite(nextValue)) {
        setLastKnownPrices((prev) => ({ ...prev, [tradeId]: nextValue }));
      }
    }
  };

  return (
    <Card
      className={cn(
        'relative overflow-hidden border-2 motion-safe:animate-slide-up',
        activeTrades.length > 0
          ? 'border-[rgb(var(--accent-info)/0.6)] bg-[rgb(var(--accent-info)/0.08)]'
          : 'border-white/10'
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgb(var(--accent-info)/0.18),_transparent_55%)] opacity-70" />
      <div className="relative">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[rgb(var(--accent-info))]">Active</span>
              <Badge variant={activeTrades.length > 0 ? 'info' : 'neutral'} size="sm">
                {activeTrades.length} Live
              </Badge>
            </div>
            <h3 className="text-xl font-semibold text-white">Active trades, high visibility</h3>
            <p className="text-xs text-ink-muted">Symbol · side · shares · entry · stop · opened</p>
          </div>
        </div>
        {activeTrades.length > 0 ? (
          <div className="space-y-3">
            {activeTrades.map((trade) => {
              const inputValue = priceInputs[trade.id] ?? '';
              const lastKnownPrice = lastKnownPrices[trade.id];
              const hasPreview = Number.isFinite(lastKnownPrice);
              const unrealizedPnL = hasPreview ? (lastKnownPrice - trade.entryPrice) * trade.remainingQty : null;
              const unrealizedOutcome =
                unrealizedPnL === null
                  ? null
                  : unrealizedPnL > 0
                    ? 'WIN'
                    : unrealizedPnL < 0
                      ? 'LOSS'
                      : 'BE';
              const projectedMode = projectedModes.get(trade.id);
              const inputError =
                inputValue && !isValidPrice(inputValue) ? 'Use numbers only' : undefined;

              return (
                <div
                  key={trade.id}
                  className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr_1fr_1.1fr_1.2fr] gap-4 p-4 rounded-xl bg-white/[0.06] border border-white/[0.08]"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge variant={trade.side === 'LONG' ? 'success' : 'danger'} size="sm">
                        {trade.side}
                      </Badge>
                      <span className="text-lg font-semibold text-white">{trade.symbol}</span>
                      <Badge variant="info" size="sm">ACTIVE</Badge>
                      <Badge variant={trade.modeAtEntry === 'HIGH' ? 'high' : 'low'} size="sm">
                        {trade.modeAtEntry}
                      </Badge>
                      <Badge variant="neutral" size="sm">
                        {formatPercent(trade.riskPctAtEntry)}
                      </Badge>
                    </div>
                    <div className="text-xs text-ink-muted">
                      Opened {formatDateTime(trade.entryDate)}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-ink-muted uppercase tracking-wider">Entry</p>
                    <p className="text-sm text-white font-medium tabular-nums">{formatMoney(trade.entryPrice)}</p>
                    <p className="text-xs text-ink-muted">{trade.remainingQty.toLocaleString()} shares</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-ink-muted uppercase tracking-wider">Stop</p>
                    <p className="text-sm text-white font-medium tabular-nums">
                      {trade.stopPrice ? formatMoney(trade.stopPrice) : 'Stop unset'}
                    </p>
                  </div>
                  <div>
                    <Input
                      label="Last price"
                      value={inputValue}
                      onChange={(event) => handlePriceChange(trade.id, event.target.value)}
                      placeholder="0.00"
                      inputMode="decimal"
                      inputSize="sm"
                      error={inputError}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div>
                      <p className="text-[10px] text-ink-muted uppercase tracking-wider">Unrealized</p>
                      {hasPreview && unrealizedPnL !== null ? (
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'text-sm font-semibold tabular-nums',
                              unrealizedPnL > 0
                                ? 'text-emerald-300'
                                : unrealizedPnL < 0
                                  ? 'text-red-300'
                                  : 'text-ink-muted'
                            )}
                          >
                            {unrealizedPnL > 0 ? '+' : ''}{formatMoney(unrealizedPnL)}
                          </span>
                          <Badge
                            variant={
                              unrealizedOutcome === 'WIN'
                                ? 'success'
                                : unrealizedOutcome === 'LOSS'
                                  ? 'danger'
                                  : 'neutral'
                            }
                            size="sm"
                          >
                            {unrealizedOutcome}
                          </Badge>
                        </div>
                      ) : (
                        <p className="text-xs text-ink-muted">Preview only</p>
                      )}
                    </div>
                    {projectedMode && (
                      <Badge variant={projectedMode === 'HIGH' ? 'high' : 'low'} size="sm">
                        IF CLOSED: TOMORROW {projectedMode}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-ink-muted">
            No active trades right now.
          </div>
        )}
      </div>
    </Card>
  );
}
