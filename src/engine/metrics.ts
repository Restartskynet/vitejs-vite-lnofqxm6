// src/engine/metrics.ts
import type { DailyRow, Metrics, Trade } from "../types/models";

export function computeMetrics(trades: Trade[], daily: DailyRow[]): Metrics {
  const totalTrades = trades.length;
  const wins = trades.filter((t) => t.win).length;
  const losses = trades.filter((t) => t.loss).length;
  const winRatePct = totalTrades ? (wins / totalTrades) * 100 : 0;

  const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
  const maxDrawdownPct = daily.reduce((min, d) => Math.min(min, d.drawdownPct), 0);

  const endingEquity = daily.length ? daily[daily.length - 1].accountEquity : null;

  return {
    totalTrades,
    wins,
    losses,
    winRatePct,
    totalPnL,
    maxDrawdownPct,
    endingEquity,
  };
}
