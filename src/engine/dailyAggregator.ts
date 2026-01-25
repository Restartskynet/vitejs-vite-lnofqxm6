import type { DailyRow, Trade } from "../types/models";

export function aggregateDaily(trades: Trade[], startingEquity: number): DailyRow[] {
  const byDay = new Map<string, { pnl: number; wins: number; losses: number; closed: number }>();

  for (const t of trades) {
    const key = t.exitDate;

    const cur = byDay.get(key) ?? { pnl: 0, wins: 0, losses: 0, closed: 0 };
    cur.pnl += t.pnl;
    cur.closed += 1;
    if (t.win) cur.wins += 1;
    if (t.loss) cur.losses += 1;

    byDay.set(key, cur);
  }

  const days = Array.from(byDay.keys()).sort();
  if (days.length === 0) return [];

  let tradingEquity = startingEquity;
  let accountEquity = startingEquity;
  let peakEquity = startingEquity;

  const out: DailyRow[] = [];

  for (const day of days) {
    const row = byDay.get(day)!;

    tradingEquity += row.pnl;
    // v1: no manual adjustments yet. Keep this field for schema stability.
    const adjustment = 0;
    accountEquity = tradingEquity + adjustment;

    peakEquity = Math.max(peakEquity, accountEquity);
    const dd = peakEquity > 0 ? (accountEquity - peakEquity) / peakEquity : 0;

    out.push({
      date: day,
      tradePnL: row.pnl,
      adjustment,
      tradingEquity,
      accountEquity,
      peakEquity,
      drawdownPct: dd,
      wins: row.wins,
      losses: row.losses,
      tradesClosed: row.closed,
    });
  }

  return out;
}
