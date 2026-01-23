import { nanoid } from "nanoid";
import type { ImportWarning, Trade, WebullFill } from "../types/models";
import { dateKeyMarket } from "../utils/dates";

interface Lot {
  qty: number;
  entryPrice: number;
}

interface OpenSession {
  symbol: string;
  entryTs: Date;
  lastExitTs: Date | null;

  totalBoughtQty: number;
  totalBoughtCost: number;

  totalSoldQty: number;
  totalSoldProceeds: number;

  pnl: number;
  legs: number;
}

export interface PositionBuildResult {
  trades: Trade[];
  warnings: ImportWarning[];
}

/**
 * Builds trades as "position sessions":
 * - Scale-ins/scale-outs collapse into one Trade
 * - PnL is still computed FIFO internally
 * - Win/loss counts match real trader intent (1 position = 1 win/loss)
 */
export function buildPositionSessions(fills: WebullFill[]): PositionBuildResult {
  const warnings: ImportWarning[] = [];
  const trades: Trade[] = [];

  const lotsBySymbol = new Map<string, Lot[]>();
  const sessionBySymbol = new Map<string, OpenSession>();

  function getLots(symbol: string): Lot[] {
    const existing = lotsBySymbol.get(symbol);
    if (existing) return existing;
    const next: Lot[] = [];
    lotsBySymbol.set(symbol, next);
    return next;
  }

  function getOrStartSession(symbol: string, entryTs: Date): OpenSession {
    const existing = sessionBySymbol.get(symbol);
    if (existing) return existing;

    const s: OpenSession = {
      symbol,
      entryTs,
      lastExitTs: null,
      totalBoughtQty: 0,
      totalBoughtCost: 0,
      totalSoldQty: 0,
      totalSoldProceeds: 0,
      pnl: 0,
      legs: 0,
    };

    sessionBySymbol.set(symbol, s);
    return s;
  }

  function finalizeIfFlat(symbol: string) {
    const lots = getLots(symbol);
    const session = sessionBySymbol.get(symbol);
    if (!session) return;

    if (lots.length > 0) return; // still holding position
    if (!session.lastExitTs) return; // never sold

    const entryPrice =
      session.totalBoughtQty > 0 ? session.totalBoughtCost / session.totalBoughtQty : 0;

    const exitPrice =
      session.totalSoldQty > 0 ? session.totalSoldProceeds / session.totalSoldQty : 0;

    const pnl = session.pnl;

    const entryTs = session.entryTs;
    const exitTs = session.lastExitTs;

    trades.push({
      id: nanoid(),
      symbol,
      qty: session.totalSoldQty,
      entryPrice,
      exitPrice,
      entryTs,
      exitTs,
      entryDate: dateKeyMarket(entryTs),
      exitDate: dateKeyMarket(exitTs),
      pnl,
      win: pnl > 0,
      loss: pnl < 0,
      legs: session.legs,
    });

    sessionBySymbol.delete(symbol);
  }

  for (const f of fills) {
    const lots = getLots(f.symbol);

    if (f.side === "BUY") {
      const s = getOrStartSession(f.symbol, f.ts);
      lots.push({ qty: f.qty, entryPrice: f.price });

      s.totalBoughtQty += f.qty;
      s.totalBoughtCost += f.qty * f.price;

      continue;
    }

    // SELL
    let remaining = f.qty;

    if (lots.length === 0) {
      warnings.push({
        level: "warning",
        message: `Unmatched SELL ignored: ${f.symbol} qty=${remaining}`,
        action: "This usually means short-selling or missing earlier history.",
      });
      continue;
    }

    const s = getOrStartSession(f.symbol, f.ts);

    while (remaining > 0 && lots.length > 0) {
      const lot = lots[0];
      const useQty = Math.min(remaining, lot.qty);

      const pnl = (f.price - lot.entryPrice) * useQty;

      s.pnl += pnl;
      s.totalSoldQty += useQty;
      s.totalSoldProceeds += useQty * f.price;
      s.lastExitTs = f.ts;
      s.legs += 1;

      lot.qty -= useQty;
      remaining -= useQty;

      if (lot.qty <= 0) lots.shift();
    }

    if (remaining > 0) {
      warnings.push({
        level: "warning",
        message: `SELL exceeded buys: ${f.symbol} remaining=${remaining}`,
        action: "Some sells were ignored (incomplete history).",
      });
    }

    // if flat, finalize trade session
    finalizeIfFlat(f.symbol);
  }

  // Warn about open positions left
  for (const [symbol, lots] of lotsBySymbol.entries()) {
    if (lots.length > 0) {
      warnings.push({
        level: "info",
        message: `Open position not closed in CSV: ${symbol}`,
        action: "Not counted in results until it’s sold/closed.",
      });
    }
  }

  // Sort trades by exit time (stable UI)
  trades.sort((a, b) => a.exitTs.getTime() - b.exitTs.getTime());

  return { trades, warnings };
}
