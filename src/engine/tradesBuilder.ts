import type {
  Fill,
  Trade,
  ClosedTradeOutcome,
  TradeWithRisk,
  PendingOrder,
  RiskStateSnapshot,
  OrderRecord,
} from './types';
import { hashString } from '../lib/hash';
import { toETDateKey } from '../lib/dateKey';
import { applyDailyDirectives } from './riskEngine';

// ============================================================================
// CONSTANTS
// ============================================================================

const PLACED_TIME_PAIR_WINDOW_MS = 2_000;

// ============================================================================
// TYPES
// ============================================================================

interface TradeUnit {
  key: string;
  symbol: string;
  entryOrders: OrderRecord[];
  entryFills: Fill[];
  exitFills: Fill[];
  protectiveStopOrders: OrderRecord[];
  activeStop: OrderRecord | null;
  entryPlacedTime: Date;
  entryTime: Date;
  entryDayKey: string;
  entryPrice: number;
  entryQty: number;
  remainingQty: number;
}

// ============================================================================
// HELPERS
// ============================================================================

function generateTradeId(symbol: string, entryTime: Date, index: number): string {
  const raw = `${symbol}-${entryTime.toISOString()}-${index}`;
  return `trade_${hashString(raw)}`;
}

function weightedAvgPrice(fills: Fill[]): number {
  const totalQty = fills.reduce((sum, f) => sum + f.quantity, 0);
  if (totalQty === 0) return 0;
  const totalValue = fills.reduce((sum, f) => sum + f.quantity * f.price, 0);
  return totalValue / totalQty;
}

function totalCommission(fills: Fill[]): number {
  return fills.reduce((sum, f) => sum + f.commission, 0);
}

function durationMinutes(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

function determineOutcome(pnl: number, isOpen: true): 'ACTIVE';
function determineOutcome(pnl: number, isOpen: false): ClosedTradeOutcome;
function determineOutcome(pnl: number, isOpen: boolean): ClosedTradeOutcome | 'ACTIVE';
function determineOutcome(pnl: number, isOpen: boolean): ClosedTradeOutcome | 'ACTIVE' {
  if (isOpen) return 'ACTIVE';
  return pnl >= 0 ? 'WIN' : 'LOSS';
}

function formatETTimestampKey(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
  const year = pick('year');
  const month = pick('month');
  const day = pick('day');
  const hour = pick('hour');
  const minute = pick('minute');
  const second = pick('second');
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

function normalizedStatus(status: string): string {
  return status.trim().toLowerCase();
}

function isFilledStatus(status: string): boolean {
  const normalized = normalizedStatus(status);
  return normalized === 'filled' || normalized === 'partial' || normalized === 'partially filled';
}

function isPendingStatus(status: string): boolean {
  const normalized = normalizedStatus(status);
  return normalized === 'pending' || normalized === 'working' || normalized === 'open';
}

function getPlacedTime(order: OrderRecord): Date | null {
  return order.placedTime ?? order.filledTime ?? null;
}

function ordersWithinWindow(a: Date, b: Date): boolean {
  return Math.abs(a.getTime() - b.getTime()) <= PLACED_TIME_PAIR_WINDOW_MS;
}

function toFillFromOrder(order: OrderRecord, fallbackId: string): Fill | null {
  const filledTime = order.filledTime ?? order.placedTime;
  const quantity = order.filledQty ?? order.totalQty ?? null;
  const price = order.avgPrice ?? order.price ?? null;
  if (!filledTime || !quantity || !price) return null;
  return {
    id: `order_${fallbackId}`,
    symbol: order.symbol,
    side: order.side,
    quantity,
    price,
    filledTime,
    placedTime: order.placedTime ?? null,
    orderId: fallbackId,
    commission: 0,
    marketDate: toETDateKey(filledTime),
    rowIndex: order.rowIndex,
    stopPrice: null,
    totalQuantity: order.totalQty ?? null,
    status: order.status,
  };
}

function orderQuantity(order: OrderRecord): number | null {
  return order.totalQty ?? order.filledQty ?? null;
}

// ============================================================================
// MAIN BUILD FUNCTION - BRACKETED ENTRY BASED
// ============================================================================

export function buildTrades(
  fills: Fill[],
  startingEquity: number = 25000,
  pendingOrders: PendingOrder[] = [],
  orders: OrderRecord[] = []
): { trades: TradeWithRisk[]; riskTimeline: RiskStateSnapshot[] } {
  const fillsByRowIndex = new Map<number, Fill>();
  for (const fill of fills) {
    fillsByRowIndex.set(fill.rowIndex, fill);
  }

  const orderRecords: OrderRecord[] =
    orders.length > 0
      ? orders
      : [
          ...fills.map((fill) => ({
            symbol: fill.symbol,
            side: fill.side,
            status: fill.status ?? 'filled',
            filledQty: fill.quantity,
            totalQty: fill.totalQuantity ?? fill.quantity,
            price: fill.stopPrice ?? fill.price,
            stopPrice: fill.stopPrice ?? null,
            avgPrice: fill.price,
            placedTime: fill.placedTime ?? fill.filledTime,
            filledTime: fill.filledTime,
            rowIndex: fill.rowIndex,
          })),
          ...pendingOrders.map((pending, index) => ({
            symbol: pending.symbol,
            side: pending.side,
            status: pending.status === 'CANCELLED' ? 'cancelled' : 'pending',
            filledQty: null,
            totalQty: pending.quantity,
            price: pending.price,
            stopPrice: pending.stopPrice ?? pending.price ?? null,
            avgPrice: pending.price,
            placedTime: pending.placedTime,
            filledTime: null,
            rowIndex: fills.length + index + 1,
          })),
        ];

  const hasPlacedTimes = orderRecords.some((order) => order.placedTime);

  const entryOrders = orderRecords
    .filter((order) => order.side === 'BUY' && isFilledStatus(order.status))
    .map((order) => ({
      ...order,
      placedTime: getPlacedTime(order),
    }))
    .filter((order) => order.placedTime !== null)
    .sort((a, b) => a.placedTime!.getTime() - b.placedTime!.getTime() || a.rowIndex - b.rowIndex);

  const tradeUnits: TradeUnit[] = [];
  const usedStopOrders = new Set<number>();

  for (const entry of entryOrders) {
    const entryPlacedTime = entry.placedTime!;
    const entryFill =
      fillsByRowIndex.get(entry.rowIndex) ?? toFillFromOrder(entry, `${entry.symbol}_${entry.rowIndex}`);
    if (!entryFill) {
      continue;
    }

    const entryQty = entryFill.quantity;
    const entryPrice = entryFill.price;
    const entryTime = entryFill.filledTime ?? entryPlacedTime;

    const bracketStops = orderRecords.filter((order) => {
      if (order.side !== 'SELL') return false;
      if (!getPlacedTime(order)) return false;
      const status = normalizedStatus(order.status);
      if (status !== 'pending' && status !== 'working' && status !== 'open' && status !== 'cancelled' && status !== 'filled') {
        return false;
      }
      if (order.symbol !== entry.symbol) return false;
      return ordersWithinWindow(entryPlacedTime, getPlacedTime(order)!);
    });

    const entryTotalQty = orderQuantity(entry) ?? entryQty;
    const exactQtyMatches = bracketStops.filter((order) => orderQuantity(order) === entryTotalQty);
    const stopCandidates = exactQtyMatches.length > 0 ? exactQtyMatches : bracketStops;

    if (stopCandidates.length === 0 && hasPlacedTimes) {
      continue;
    }

    for (const stop of stopCandidates) {
      usedStopOrders.add(stop.rowIndex);
    }

    const earliestPlaced = [entryPlacedTime, ...stopCandidates.map((stop) => getPlacedTime(stop)!)].reduce(
      (min, current) => (current.getTime() < min.getTime() ? current : min),
      entryPlacedTime
    );

    const activeStop =
      stopCandidates
        .filter((order) => isPendingStatus(order.status))
        .sort((a, b) => getPlacedTime(b)!.getTime() - getPlacedTime(a)!.getTime())[0] ?? null;

    tradeUnits.push({
      key: `${entry.symbol}|${formatETTimestampKey(earliestPlaced)}`,
      symbol: entry.symbol,
      entryOrders: [entry],
      entryFills: [entryFill],
      exitFills: [],
      protectiveStopOrders: [...stopCandidates],
      activeStop,
      entryPlacedTime,
      entryTime,
      entryDayKey: toETDateKey(entryTime),
      entryPrice,
      entryQty,
      remainingQty: entryQty,
    });
  }

  const stopAdjustments = orderRecords.filter((order) => {
    if (order.side !== 'SELL') return false;
    if (!getPlacedTime(order)) return false;
    const status = normalizedStatus(order.status);
    if (status !== 'pending' && status !== 'working' && status !== 'open' && status !== 'cancelled') {
      return false;
    }
    return !usedStopOrders.has(order.rowIndex);
  });

  const sellFills = fills
    .filter((fill) => fill.side === 'SELL')
    .sort((a, b) => a.filledTime.getTime() - b.filledTime.getTime() || a.rowIndex - b.rowIndex);

  const events: Array<{ type: 'stop' | 'sell'; time: Date; order?: OrderRecord; fill?: Fill }> = [];
  for (const stop of stopAdjustments) {
    const placedTime = getPlacedTime(stop);
    if (placedTime) {
      events.push({ type: 'stop', time: placedTime, order: stop });
    }
  }
  for (const fill of sellFills) {
    events.push({ type: 'sell', time: fill.filledTime, fill });
  }
  events.sort((a, b) => {
    const timeDiff = a.time.getTime() - b.time.getTime();
    if (timeDiff !== 0) return timeDiff;
    const aIndex = a.order?.rowIndex ?? a.fill?.rowIndex ?? 0;
    const bIndex = b.order?.rowIndex ?? b.fill?.rowIndex ?? 0;
    return aIndex - bIndex;
  });

  const openBySymbol = new Map<string, TradeUnit[]>();
  for (const unit of tradeUnits) {
    const list = openBySymbol.get(unit.symbol) ?? [];
    list.push(unit);
    openBySymbol.set(unit.symbol, list);
  }
  for (const list of openBySymbol.values()) {
    list.sort((a, b) => a.entryTime.getTime() - b.entryTime.getTime());
  }

  const chooseStopTarget = (stop: OrderRecord, candidates: TradeUnit[]): TradeUnit | null => {
    if (candidates.length === 0) return null;
    const stopQty = orderQuantity(stop);
    const placedTime = getPlacedTime(stop);
    const stopPrice = stop.price ?? stop.avgPrice ?? null;
    const scored = candidates.map((unit) => {
      const qtyMatch = stopQty !== null && stopQty === unit.remainingQty ? 0 : stopQty !== null && stopQty === unit.entryQty ? 1 : 2;
      const lastStopTime = unit.activeStop ? getPlacedTime(unit.activeStop) : unit.entryPlacedTime;
      const timeDiff = placedTime && lastStopTime ? Math.abs(placedTime.getTime() - lastStopTime.getTime()) : Number.POSITIVE_INFINITY;
      const pricePlausible = stopPrice !== null ? (stopPrice <= unit.entryPrice ? 0 : 1) : 2;
      return { unit, qtyMatch, timeDiff, pricePlausible };
    });
    scored.sort((a, b) => {
      if (a.qtyMatch !== b.qtyMatch) return a.qtyMatch - b.qtyMatch;
      if (a.timeDiff !== b.timeDiff) return a.timeDiff - b.timeDiff;
      if (a.pricePlausible !== b.pricePlausible) return a.pricePlausible - b.pricePlausible;
      return a.unit.entryTime.getTime() - b.unit.entryTime.getTime();
    });
    return scored[0]?.unit ?? null;
  };

  for (const event of events) {
    if (event.type === 'stop' && event.order) {
      const stop = event.order;
      const placedTime = getPlacedTime(stop);
      if (!placedTime) continue;
      const candidates = (openBySymbol.get(stop.symbol) ?? []).filter(
        (unit) => unit.remainingQty > 0 && unit.entryTime <= placedTime
      );
      const target = chooseStopTarget(stop, candidates);
      if (target) {
        target.protectiveStopOrders.push(stop);
        if (isPendingStatus(stop.status)) {
          target.activeStop = stop;
        } else if (normalizedStatus(stop.status) === 'cancelled' && target.activeStop?.rowIndex === stop.rowIndex) {
          target.activeStop = null;
        }
      }
    }

    if (event.type === 'sell' && event.fill) {
      const fill = event.fill;
      const candidates = (openBySymbol.get(fill.symbol) ?? []).filter((unit) => unit.remainingQty > 0);
      if (candidates.length === 0) continue;

      const fillPlacedTime = fill.placedTime ?? fill.filledTime;
      const matchingStop = candidates.find((unit) =>
        unit.protectiveStopOrders.some((stop) => {
          const stopTime = getPlacedTime(stop);
          if (!stopTime || !fillPlacedTime) return false;
          return ordersWithinWindow(stopTime, fillPlacedTime);
        })
      );

      let target: TradeUnit | null = null;
      if (matchingStop) {
        target = matchingStop;
      } else {
        const fillTotalQty = fill.totalQuantity ?? fill.quantity;
        const qtyMatches = candidates.filter(
          (unit) => unit.activeStop && orderQuantity(unit.activeStop) === fillTotalQty
        );
        if (qtyMatches.length === 1) {
          target = qtyMatches[0];
        } else {
          target = candidates.sort((a, b) => a.entryTime.getTime() - b.entryTime.getTime())[0];
        }
      }

      if (!target) continue;

      const allocatedQty = Math.min(target.remainingQty, fill.quantity);
      const allocatedFill: Fill = {
        ...fill,
        id: `${fill.id}-alloc-${target.key}`,
        quantity: allocatedQty,
      };
      target.exitFills.push(allocatedFill);
      target.remainingQty = Math.max(0, target.remainingQty - allocatedQty);
    }
  }

  const trades: TradeWithRisk[] = [];
  let tradeIndex = 0;

  for (const unit of tradeUnits) {
    const entryPrice = weightedAvgPrice(unit.entryFills);
    const entryQty = unit.entryFills.reduce((sum, fill) => sum + fill.quantity, 0);
    const exitPrice = weightedAvgPrice(unit.exitFills);
    const commissionTotal = totalCommission(unit.entryFills) + totalCommission(unit.exitFills);

    const realizedPnL =
      unit.exitFills.reduce((sum, fill) => sum + fill.quantity * fill.price, 0) -
      unit.entryFills.reduce((sum, fill) => sum + fill.quantity * fill.price, 0) -
      commissionTotal;

    const isClosed = unit.remainingQty <= 0;
    const exitDate = isClosed ? unit.exitFills[unit.exitFills.length - 1]?.filledTime ?? null : null;
    const exitDayKey = exitDate ? toETDateKey(exitDate) : null;
    const marketDate = exitDayKey ?? unit.entryDayKey;
    const pnlPercent = entryPrice > 0 ? (realizedPnL / (entryPrice * entryQty)) * 100 : 0;

    const outcome = determineOutcome(realizedPnL, !isClosed);

    const stopPrice = unit.activeStop?.stopPrice ?? unit.activeStop?.price ?? null;
    const stopSource: 'user' | 'none' = stopPrice ? 'user' : 'none';

    const trade: TradeWithRisk = {
      id: generateTradeId(unit.symbol, unit.entryTime, tradeIndex++),
      symbol: unit.symbol,
      side: 'LONG',
      status: isClosed ? 'CLOSED' : 'ACTIVE',
      entryDate: unit.entryTime,
      entryDayKey: unit.entryDayKey,
      entryPrice,
      entryFills: [...unit.entryFills],
      exitDate,
      exitDayKey,
      exitPrice: isClosed ? exitPrice : null,
      exitFills: [...unit.exitFills],
      quantity: entryQty,
      remainingQty: Math.max(0, unit.remainingQty),
      realizedPnL: isClosed ? realizedPnL : 0,
      unrealizedPnL: 0,
      totalPnL: isClosed ? realizedPnL : 0,
      pnlPercent: isClosed ? pnlPercent : 0,
      commission: commissionTotal,
      riskUsed: 0,
      riskPercent: 0,
      stopPrice,
      modeAtEntry: 'HIGH',
      riskPctAtEntry: 0,
      equityAtEntry: startingEquity,
      riskDollarsAtEntry: 0,
      outcome,
      marketDate,
      durationMinutes: exitDate ? durationMinutes(unit.entryTime, exitDate) : null,
      inferredStop: stopPrice,
      pendingExit: null,
      stopSource,
    };

    trades.push(trade);
  }

  const { assignments } = applyDailyDirectives(trades, startingEquity);
  const enrichedTrades = trades.map((trade) => {
    const assignment = assignments.get(trade.id);
    if (!assignment) return trade;
    return {
      ...trade,
      modeAtEntry: assignment.modeAtEntry,
      riskPctAtEntry: assignment.riskPctAtEntry,
      equityAtEntry: assignment.equityAtEntry,
      riskDollarsAtEntry: assignment.riskDollarsAtEntry,
      riskUsed: assignment.riskDollarsAtEntry,
      riskPercent: assignment.riskPctAtEntry * 100,
    };
  });

  const riskTimeline: RiskStateSnapshot[] = [];

  enrichedTrades.sort((a, b) => {
    if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
    if (a.status !== 'ACTIVE' && b.status === 'ACTIVE') return 1;
    return b.entryDate.getTime() - a.entryDate.getTime();
  });

  return { trades: enrichedTrades, riskTimeline };
}

/**
 * Calculate aggregate metrics from trades
 */
export function calculateMetrics(trades: Trade[]) {
  if (!Array.isArray(trades)) {
    console.warn('calculateMetrics received non-array:', typeof trades);
    trades = [];
  }
  const closedTrades = trades.filter((t) => t.status === 'CLOSED');
  const wins = closedTrades.filter((t) => t.outcome === 'WIN');
  const losses = closedTrades.filter((t) => t.outcome === 'LOSS');
  const breakeven = closedTrades.filter((t) => t.outcome === 'BREAKEVEN');

  const totalPnL = closedTrades.reduce((sum, t) => sum + t.realizedPnL, 0);
  const grossWins = wins.reduce((sum, t) => sum + t.realizedPnL, 0);
  const grossLosses = Math.abs(losses.reduce((sum, t) => sum + t.realizedPnL, 0));

  const avgWin = wins.length > 0 ? grossWins / wins.length : 0;
  const avgLoss = losses.length > 0 ? grossLosses / losses.length : 0;
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0;

  // Calculate streaks (by entry time order)
  let currentStreak = 0;
  let streakType: 'WIN' | 'LOSS' | 'NONE' = 'NONE';
  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;
  let tempWinStreak = 0;
  let tempLossStreak = 0;

  // Process in entry time order
  const chronological = [...closedTrades].sort((a, b) => a.entryDate.getTime() - b.entryDate.getTime());

  for (const trade of chronological) {
    if (trade.outcome === 'WIN') {
      tempWinStreak++;
      tempLossStreak = 0;
      maxConsecutiveWins = Math.max(maxConsecutiveWins, tempWinStreak);
    } else if (trade.outcome === 'LOSS') {
      tempLossStreak++;
      tempWinStreak = 0;
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, tempLossStreak);
    }
  }

  // Current streak from most recent trade
  if (chronological.length > 0) {
    const lastTrade = chronological[chronological.length - 1];
    if (lastTrade.outcome === 'WIN') {
      streakType = 'WIN';
    } else if (lastTrade.outcome === 'LOSS') {
      streakType = 'LOSS';
    }

    if (streakType !== 'NONE') {
      for (let i = chronological.length - 1; i >= 0; i--) {
        const t = chronological[i];
        if (t.outcome === streakType) currentStreak++;
        else break;
      }
    }
  }

  return {
    totalTrades: closedTrades.length,
    wins: wins.length,
    losses: losses.length,
    breakeven: breakeven.length,
    winRate: closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0,
    totalPnL,
    avgWin,
    avgLoss,
    profitFactor,
    maxDrawdownPct: 0,
    currentStreak,
    streakType,
    maxConsecutiveWins,
    maxConsecutiveLosses,
  };
}
