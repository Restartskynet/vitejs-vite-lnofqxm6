import type { DailyRow, Trade } from "../types/models";

export interface Metrics {
  totalTrades: number;
  wins: number;
  losses: number;
  winRatePct: number;
  totalPnL: number;
  maxDrawdownPct: number; // negative
  endingEquity: number | null;
}

export function computeMetrics(trades: Trade[], daily: DailyRow[]): Metrics {
  const totalTrades = trades.length;
  const wins = trades.filter((t) => t.win).length;
  const losses = trades.filter((t) => t.loss).length;
  const winRatePct = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const totalPnL = trades.reduce((a, t) => a + t.pnl, 0);

  const maxDrawdownPct =
    daily.length > 0 ? Math.min(...daily.map((d) => d.drawdownPct)) : 0;

  const endingEquity = daily.length > 0 ? daily[daily.length - 1].accountEquity : null;

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
