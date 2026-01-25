import type { ImportWarning, Trade, WebullFill } from "../types/models";
import { dateKeyMarket } from "../utils/dates";

type OpenPosition = {
  symbol: string;
  qty: number; // shares currently held
  avgCost: number; // average cost basis
  firstBuyTs: Date | null;
  legs: number;
};

function idNum(n: number): string {
  // Fixed precision string for deterministic IDs across runs
  return Number.isFinite(n) ? n.toFixed(6) : "NaN";
}

function makeTradeId(t: Omit<Trade, "id">): string {
  // A stable, deterministic ID (important for tests + trust)
  return [
    t.symbol,
    t.entryTs.toISOString(),
    t.exitTs.toISOString(),
    String(t.qty),
    idNum(t.entryPrice),
    idNum(t.exitPrice),
    String(t.legs),
  ].join("|");
}

export function buildPositionSessions(
  fills: WebullFill[]
): { trades: Trade[]; warnings: ImportWarning[] } {
  const warnings: ImportWarning[] = [];
  const trades: Trade[] = [];

  const positions = new Map<string, OpenPosition>();

  for (const fill of fills) {
    const symbol = fill.symbol;
    const side = fill.side;

    const pos = positions.get(symbol) ?? {
      symbol,
      qty: 0,
      avgCost: 0,
      firstBuyTs: null,
      legs: 0,
    };

    // BUY: increase position, recalc avg cost
    if (side === "BUY") {
      const newQty = pos.qty + fill.qty;
      const newCostBasis = pos.avgCost * pos.qty + fill.price * fill.qty;
      pos.qty = newQty;
      pos.avgCost = newQty > 0 ? newCostBasis / newQty : 0;
      pos.firstBuyTs = pos.firstBuyTs ?? fill.ts;
      pos.legs += 1;
      positions.set(symbol, pos);
      continue;
    }

    // SELL: only valid if we actually have shares
    if (pos.qty <= 0) {
      warnings.push({
        level: "warning",
        code: "sell_without_position",
        message: `Sell ignored for ${symbol} because you had no open position.`,
      });
      continue;
    }

    const sellQty = Math.min(pos.qty, fill.qty);
    const entryPrice = pos.avgCost;
    const exitPrice = fill.price;

    const pnl = (exitPrice - entryPrice) * sellQty;
    const denom = entryPrice * sellQty;
    const pct = denom > 0 ? pnl / denom : 0;

    const tradeNoId: Omit<Trade, "id"> = {
      symbol,
      qty: sellQty,
      entryPrice,
      exitPrice,
      entryTs: pos.firstBuyTs ?? fill.ts,
      exitTs: fill.ts,
      entryDate: dateKeyMarket(pos.firstBuyTs ?? fill.ts),
      exitDate: dateKeyMarket(fill.ts),
      pnl,
      pct,
      win: pnl > 0,
      loss: pnl < 0,
      legs: pos.legs + 1, // include this sell leg
    };

    const trade: Trade = { id: makeTradeId(tradeNoId), ...tradeNoId };
    trades.push(trade);

    // Reduce position
    pos.qty = pos.qty - sellQty;
    pos.legs += 1;

    if (pos.qty <= 0) {
      // Position fully closed
      positions.delete(symbol);
    } else {
      // Still open — keep avgCost the same, keep firstBuyTs
      positions.set(symbol, pos);
    }

    // If the sell qty was larger than current position, warn about the overflow
    if (fill.qty > sellQty) {
      warnings.push({
        level: "warning",
        code: "sell_exceeds_position",
        message: `Sell for ${symbol} exceeded open position. Used ${sellQty} of ${fill.qty}.`,
      });
    }
  }

  // Any open positions left = warning
  for (const [symbol, pos] of positions.entries()) {
    if (pos.qty > 0) {
      warnings.push({
        level: "info",
        code: "open_position_remaining",
        message: `Position still open for ${symbol}: ${pos.qty} shares remaining. Export more data to close it.`,
      });
    }
  }

  // Sort trades by exit time for stability
  trades.sort((a, b) => a.exitTs.getTime() - b.exitTs.getTime());

  return { trades, warnings };
}
