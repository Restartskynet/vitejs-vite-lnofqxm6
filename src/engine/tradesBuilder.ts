import type { Fill, Trade, ClosedTradeOutcome, TradeWithRisk, PendingOrder, RiskStateSnapshot } from './types';
import { hashString } from '../lib/hash';

// ============================================================================
// TYPES
// ============================================================================

interface OpenPosition {
  symbol: string;
  side: 'LONG' | 'SHORT';
  quantity: number;
  avgEntryPrice: number;
  entryFills: Fill[];
  exitFills: Fill[];
  firstEntryTime: Date;
  totalCommission: number;
}

interface RiskEngineState {
  mode: 'HIGH' | 'LOW';
  lowWinsProgress: number;
  equity: number;
}

// ============================================================================
// HELPER FUNCTIONS
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

/**
 * Determine outcome based on P&L and open status.
 * Uses function overloads for proper type narrowing:
 * - When isOpen is true (literal), returns 'ACTIVE'
 * - When isOpen is false (literal), returns ClosedTradeOutcome
 */
function determineOutcome(pnl: number, isOpen: true): 'ACTIVE';
function determineOutcome(pnl: number, isOpen: false): ClosedTradeOutcome;
function determineOutcome(pnl: number, isOpen: boolean): ClosedTradeOutcome | 'ACTIVE';
function determineOutcome(pnl: number, isOpen: boolean): ClosedTradeOutcome | 'ACTIVE' {
  if (isOpen) return 'ACTIVE';
  // Use small threshold to avoid floating point issues
  if (pnl > 0.005) return 'WIN';
  if (pnl < -0.005) return 'LOSS';
  return 'BREAKEVEN';
}

/**
 * Apply risk state transition based on trade outcome
 */
function applyRiskTransition(
  state: RiskEngineState, 
  outcome: ClosedTradeOutcome,
  pnl: number
): RiskEngineState {
  const newState = { ...state };
  
  // Update equity
  newState.equity += pnl;
  
  // BREAKEVEN - no state change
  if (outcome === 'BREAKEVEN') {
    return newState;
  }
  
  if (newState.mode === 'HIGH') {
    // In HIGH mode: 1 LOSS drops to LOW
    if (outcome === 'LOSS') {
      newState.mode = 'LOW';
      newState.lowWinsProgress = 0;
    }
    // WINs in HIGH don't accumulate
  } else {
    // In LOW mode
    if (outcome === 'WIN') {
      newState.lowWinsProgress += 1;
      // 2 wins returns to HIGH
      if (newState.lowWinsProgress >= 2) {
        newState.mode = 'HIGH';
        newState.lowWinsProgress = 0;
      }
    } else if (outcome === 'LOSS') {
      // LOSS resets progress but stays in LOW
      newState.lowWinsProgress = 0;
    }
  }
  
  return newState;
}

/**
 * Find pending stop/exit orders without inference
 */
function findInferredStop(
  symbol: string,
  side: 'LONG' | 'SHORT',
  entryPrice: number,
  entryTime: Date,
  pendingOrders: PendingOrder[]
): { inferredStop: number | null; pendingExit: number | null; stopSource: 'user' | 'none' } {
  // Find pending orders for this symbol placed after entry
  const relevantPending = pendingOrders.filter(po => 
    po.symbol === symbol && 
    po.placedTime >= entryTime
  );
  
  if (relevantPending.length === 0) {
    return { inferredStop: null, pendingExit: null, stopSource: 'none' };
  }
  
  let inferredStop: number | null = null;
  let pendingExit: number | null = null;
  let stopSource: 'user' | 'none' = 'none';
  const exitSide = side === 'LONG' ? 'SELL' : 'BUY';

  const pickStop = (candidate: number, source: 'user' | 'none') => {
    if (inferredStop === null) {
      inferredStop = candidate;
      stopSource = source;
      return;
    }
    if (side === 'LONG') {
      if (candidate > inferredStop) {
        inferredStop = candidate;
        stopSource = source;
      }
      return;
    }
    if (candidate < inferredStop) {
      inferredStop = candidate;
      stopSource = source;
    }
  };

  const pickPendingExit = (candidate: number) => {
    if (pendingExit === null) {
      pendingExit = candidate;
      return;
    }
    if (side === 'LONG') {
      if (candidate < pendingExit) pendingExit = candidate;
      return;
    }
    if (candidate > pendingExit) pendingExit = candidate;
  };
  
  for (const po of relevantPending) {
    if (po.side !== exitSide) continue;
    if (po.type === 'STOP' && po.stopPrice !== null) {
      pickStop(po.stopPrice, 'user');
      continue;
    }
    if (po.type === 'LIMIT' && po.price !== null) {
      pickPendingExit(po.price);
      continue;
    }
    if (po.price !== null) {
      const isStopCandidate = side === 'LONG' ? po.price <= entryPrice : po.price >= entryPrice;
      if (isStopCandidate) {
        pickStop(po.price, 'none');
      } else {
        pickPendingExit(po.price);
      }
    }
  }
  
  return { 
    inferredStop, 
    pendingExit, 
    stopSource,
  };
}

// ============================================================================
// MAIN BUILD FUNCTION - POSITION BASED
// ============================================================================

/**
 * Build trades from fills using position-based reconstruction.
 * 
 * Algorithm:
 * 1. Sort fills by filledTime ascending
 * 2. Maintain per-symbol open position
 * 3. Trade begins when position goes from 0 → non-zero
 * 4. Entry fills add to position in same direction
 * 5. Exit fills reduce position (realize P&L on closed portion)
 * 6. Trade closes when position returns to 0
 * 7. Position flip = close prior trade, start new trade
 */
export function buildTrades(
  fills: Fill[], 
  startingEquity: number = 25000,
  pendingOrders: PendingOrder[] = []
): { trades: TradeWithRisk[]; riskTimeline: RiskStateSnapshot[] } {
  // Sort fills by time, then by original order for tie-breaking
  const sortedFills = [...fills].sort((a, b) => {
    const timeDiff = a.filledTime.getTime() - b.filledTime.getTime();
    if (timeDiff !== 0) return timeDiff;
    return (a.rowIndex ?? 0) - (b.rowIndex ?? 0);
  });
  
  const trades: TradeWithRisk[] = [];
  const riskTimeline: RiskStateSnapshot[] = [];
  const positions = new Map<string, OpenPosition>();
  
  // Initialize risk state
  let riskState: RiskEngineState = {
    mode: 'HIGH',
    lowWinsProgress: 0,
    equity: startingEquity,
  };
  
  let tradeIndex = 0;
  
  for (const fill of sortedFills) {
    const symbol = fill.symbol;
    const fillSide = fill.side;
    const fillQty = fill.quantity;
    const fillPrice = fill.price;
    
    let pos = positions.get(symbol);
    
    // Determine if this fill opens, adds to, or reduces position
    const isOpening = !pos || pos.quantity === 0;
    const isSameDirection = pos && (
      (pos.side === 'LONG' && fillSide === 'BUY') ||
      (pos.side === 'SHORT' && fillSide === 'SELL')
    );
    
    if (isOpening) {
      // START NEW POSITION
      const newSide: 'LONG' | 'SHORT' = fillSide === 'BUY' ? 'LONG' : 'SHORT';
      
      pos = {
        symbol,
        side: newSide,
        quantity: fillQty,
        avgEntryPrice: fillPrice,
        entryFills: [fill],
        exitFills: [],
        firstEntryTime: fill.filledTime,
        totalCommission: fill.commission,
      };
      positions.set(symbol, pos);
      
    } else if (isSameDirection) {
      // ADD TO POSITION - recalculate average entry price
      const newTotalQty = pos!.quantity + fillQty;
      const newTotalCost = pos!.avgEntryPrice * pos!.quantity + fillPrice * fillQty;
      pos!.avgEntryPrice = newTotalCost / newTotalQty;
      pos!.quantity = newTotalQty;
      pos!.entryFills.push(fill);
      pos!.totalCommission += fill.commission;
      
    } else {
      // REDUCING POSITION (exit fill)
      const closingQty = Math.min(fillQty, pos!.quantity);
      const remainingQty = pos!.quantity - closingQty;
      const flippingQty = fillQty - closingQty;
      const commissionRatio = fill.quantity > 0 ? closingQty / fill.quantity : 0;
      const closingFill: Fill = {
        ...fill,
        id: `${fill.id}-close`,
        quantity: closingQty,
        commission: fill.commission * commissionRatio,
      };
      
      pos!.exitFills.push(closingFill);
      pos!.totalCommission += closingFill.commission;
      
      // Determine if position is now closed
      const isClosing = remainingQty <= 0.001;
      
      if (isClosing || flippingQty > 0) {
        // CREATE COMPLETED TRADE
        const entryPrice = weightedAvgPrice(pos!.entryFills);
        const exitPrice = weightedAvgPrice(pos!.exitFills);
        const quantity = pos!.entryFills.reduce((sum, f) => sum + f.quantity, 0);
        const entryDate = pos!.firstEntryTime;
        const exitDate = fill.filledTime;
        const commissionTotal = totalCommission(pos!.entryFills) + totalCommission(pos!.exitFills);
        
        let realizedPnL = 0;
        if (pos!.side === 'LONG') {
          realizedPnL = (exitPrice - entryPrice) * quantity;
        } else {
          realizedPnL = (entryPrice - exitPrice) * quantity;
        }
        realizedPnL -= commissionTotal;
        
        const costBasis = entryPrice * quantity;
        const pnlPercent = costBasis > 0 ? (realizedPnL / costBasis) * 100 : 0;
        
        // Using false literal ensures TypeScript narrows to ClosedTradeOutcome
        const outcome = determineOutcome(realizedPnL, false);
        
        // Record risk state BEFORE this trade closes
        const riskPctAtEntry = riskState.mode === 'HIGH' ? 0.03 : 0.001;
        const equityAtEntry = riskState.equity;
        const riskDollarsAtEntry = equityAtEntry * riskPctAtEntry;
        
        const exitStop = pos!.exitFills.find(exitFill => exitFill.stopPrice !== null && exitFill.stopPrice !== undefined)?.stopPrice ?? null;
        const stopSource: 'user' | 'none' = exitStop ? 'user' : 'none';
        const stopInfo = { inferredStop: exitStop, pendingExit: null, stopSource };
        
        const trade: TradeWithRisk = {
          id: generateTradeId(symbol, entryDate, tradeIndex++),
          symbol,
          side: pos!.side,
          status: 'CLOSED',
          entryDate,
          entryPrice,
          entryFills: [...pos!.entryFills],
          exitDate,
          exitPrice,
          exitFills: [...pos!.exitFills],
          quantity,
          remainingQty: 0,
          realizedPnL,
          unrealizedPnL: 0,
          totalPnL: realizedPnL,
          pnlPercent,
          commission: commissionTotal,
          riskUsed: riskDollarsAtEntry,
          riskPercent: riskPctAtEntry * 100,
          stopPrice: exitStop,
          outcome,
          marketDate: fill.marketDate,
          durationMinutes: durationMinutes(entryDate, exitDate),
          // Extended fields
          riskPctAtEntry,
          equityAtEntry,
          riskDollarsAtEntry,
          ...stopInfo,
        };
        
        trades.push(trade);
        
        // Record risk timeline entry
        const stateBefore = { ...riskState };
        // outcome is now properly typed as ClosedTradeOutcome due to function overload
        riskState = applyRiskTransition(riskState, outcome, realizedPnL);
        
        riskTimeline.push({
          tradeId: trade.id,
          tradeOutcome: outcome,
          tradePnL: realizedPnL,
          modeBefore: stateBefore.mode,
          modeAfter: riskState.mode,
          lowWinsProgressBefore: stateBefore.lowWinsProgress,
          lowWinsProgressAfter: riskState.lowWinsProgress,
          equityBefore: stateBefore.equity,
          equityAfter: riskState.equity,
          riskPctApplied: riskPctAtEntry,
          timestamp: exitDate,
        });
        
        // Handle position flip
        if (flippingQty > 0) {
          // Start new position in opposite direction
          const newSide: 'LONG' | 'SHORT' = fillSide === 'BUY' ? 'LONG' : 'SHORT';
          const flipCommissionRatio = fill.quantity > 0 ? flippingQty / fill.quantity : 0;
          const flipFill: Fill = {
            ...fill,
            id: `${fill.id}-flip`,
            quantity: flippingQty,
            commission: fill.commission * flipCommissionRatio,
          };
          positions.set(symbol, {
            symbol,
            side: newSide,
            quantity: flippingQty,
            avgEntryPrice: fillPrice,
            entryFills: [flipFill],
            exitFills: [],
            firstEntryTime: fill.filledTime,
            totalCommission: flipFill.commission,
          });
        } else {
          // Clear position
          positions.delete(symbol);
        }
      } else {
        // Partial close - update remaining quantity
        pos!.quantity = remainingQty;
      }
    }
  }
  
  // CREATE ACTIVE TRADES for remaining positions
  for (const [symbol, pos] of positions) {
    if (pos.quantity > 0.001) {
      const entryPrice = pos.avgEntryPrice;
      const entryDate = pos.firstEntryTime;
      const quantity = pos.quantity;
      
      // Risk at entry
      const riskPctAtEntry = riskState.mode === 'HIGH' ? 0.03 : 0.001;
      const equityAtEntry = riskState.equity;
      const riskDollarsAtEntry = equityAtEntry * riskPctAtEntry;
      
      // Find pending stop for active trades
      const stopInfo = findInferredStop(symbol, pos.side, entryPrice, entryDate, pendingOrders);
      
      const trade: TradeWithRisk = {
        id: generateTradeId(symbol, entryDate, tradeIndex++),
        symbol,
        side: pos.side,
        status: 'ACTIVE',
        entryDate,
        entryPrice,
        entryFills: [...pos.entryFills],
        exitDate: null,
        exitPrice: null,
        exitFills: [...pos.exitFills],
        quantity,
        remainingQty: quantity,
        realizedPnL: 0,
        unrealizedPnL: 0,
        totalPnL: 0,
        pnlPercent: 0,
        commission: pos.totalCommission,
        riskUsed: riskDollarsAtEntry,
        riskPercent: riskPctAtEntry * 100,
        stopPrice: stopInfo.inferredStop,
        outcome: 'ACTIVE',
        marketDate: pos.entryFills[0]?.marketDate || entryDate.toISOString().split('T')[0],
        durationMinutes: null,
        // Extended fields
        riskPctAtEntry,
        equityAtEntry,
        riskDollarsAtEntry,
        ...stopInfo,
      };
      
      trades.push(trade);
    }
  }
  
  // Sort trades: ACTIVE first, then by entryDate descending
  trades.sort((a, b) => {
    // ACTIVE trades first
    if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
    if (a.status !== 'ACTIVE' && b.status === 'ACTIVE') return 1;
    // Then by entry time descending (most recent first)
    return b.entryDate.getTime() - a.entryDate.getTime();
  });
  
  return { trades, riskTimeline };
}

/**
 * Calculate aggregate metrics from trades
 */
export function calculateMetrics(trades: Trade[]) {
  if (!Array.isArray(trades)) {
    console.warn('calculateMetrics received non-array:', typeof trades);
    trades = [];
  }
  const closedTrades = trades.filter(t => t.status === 'CLOSED');
  const wins = closedTrades.filter(t => t.outcome === 'WIN');
  const losses = closedTrades.filter(t => t.outcome === 'LOSS');
  const breakeven = closedTrades.filter(t => t.outcome === 'BREAKEVEN');
  
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
  const chronological = [...closedTrades].sort((a, b) => 
    a.entryDate.getTime() - b.entryDate.getTime()
  );
  
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
      currentStreak = tempWinStreak;
    } else if (lastTrade.outcome === 'LOSS') {
      streakType = 'LOSS';
      currentStreak = tempLossStreak;
    }
  }
  
  return {
    totalTrades: closedTrades.length,
    wins: wins.length,
    losses: losses.length,
    breakeven: breakeven.length,
    winRate: closedTrades.length > 0 ? wins.length / closedTrades.length : 0,
    totalPnL,
    avgWin,
    avgLoss,
    profitFactor: profitFactor === Infinity ? 999 : profitFactor,
    maxDrawdownPct: 0, // Calculated separately
    currentStreak,
    streakType,
    maxConsecutiveWins,
    maxConsecutiveLosses,
  };
}
