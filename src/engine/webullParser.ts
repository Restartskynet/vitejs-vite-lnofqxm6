import type { Fill, Trade } from './types';

/**
 * Generate a stable trade ID
 */
function generateTradeId(symbol: string, marketDate: string, index: number): string {
  const raw = `${symbol}-${marketDate}-${index}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `trade_${Math.abs(hash).toString(36)}`;
}

/**
 * Calculate weighted average price from fills
 */
function weightedAvgPrice(fills: Fill[]): number {
  const totalQty = fills.reduce((sum, f) => sum + f.quantity, 0);
  if (totalQty === 0) return 0;
  const totalValue = fills.reduce((sum, f) => sum + f.quantity * f.price, 0);
  return totalValue / totalQty;
}

/**
 * Calculate total commission from fills
 */
function totalCommission(fills: Fill[]): number {
  return fills.reduce((sum, f) => sum + f.commission, 0);
}

/**
 * Calculate duration in minutes between two dates
 */
function durationMinutes(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

/**
 * Determine trade outcome based on P&L
 */
function determineOutcome(pnl: number, isOpen: boolean): 'WIN' | 'LOSS' | 'BREAKEVEN' | 'OPEN' {
  if (isOpen) return 'OPEN';
  if (pnl > 0.01) return 'WIN';
  if (pnl < -0.01) return 'LOSS';
  return 'BREAKEVEN';
}

/**
 * Build trades from fills using Position Session method
 * (All same-day, same-symbol fills are grouped into one trade)
 */
export function buildTrades(fills: Fill[], startingEquity: number = 25000): Trade[] {
  // Group fills by symbol and market date
  const grouped = new Map<string, Fill[]>();
  
  for (const fill of fills) {
    const key = `${fill.symbol}|${fill.marketDate}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(fill);
  }
  
  const trades: Trade[] = [];
  let tradeIndex = 0;
  
  // Process each group
  for (const [key, groupFills] of grouped) {
    const [symbol, marketDate] = key.split('|');
    
    // Sort fills by time within the group
    groupFills.sort((a, b) => a.filledTime.getTime() - b.filledTime.getTime());
    
    // Separate buys and sells
    const buyFills = groupFills.filter(f => f.side === 'BUY');
    const sellFills = groupFills.filter(f => f.side === 'SELL');
    
    const totalBuyQty = buyFills.reduce((sum, f) => sum + f.quantity, 0);
    const totalSellQty = sellFills.reduce((sum, f) => sum + f.quantity, 0);
    
    // Determine if this is a long or short trade
    // If buys came first (by time) and there are more buys or equal, it's a long
    const firstBuy = buyFills[0]?.filledTime.getTime() ?? Infinity;
    const firstSell = sellFills[0]?.filledTime.getTime() ?? Infinity;
    const isLong = firstBuy <= firstSell;
    
    // Entry and exit fills based on trade direction
    const entryFills = isLong ? buyFills : sellFills;
    const exitFills = isLong ? sellFills : buyFills;
    
    const entryQty = entryFills.reduce((sum, f) => sum + f.quantity, 0);
    const exitQty = exitFills.reduce((sum, f) => sum + f.quantity, 0);
    
    // Calculate position details
    const quantity = Math.max(entryQty, exitQty);
    const remainingQty = isLong ? totalBuyQty - totalSellQty : totalSellQty - totalBuyQty;
    const isOpen = remainingQty > 0;
    
    // Prices
    const entryPrice = weightedAvgPrice(entryFills);
    const exitPrice = exitFills.length > 0 ? weightedAvgPrice(exitFills) : null;
    
    // Dates
    const entryDate = entryFills[0]?.filledTime ?? new Date();
    const exitDate = exitFills.length > 0 ? exitFills[exitFills.length - 1].filledTime : null;
    
    // P&L calculation
    const closedQty = Math.min(entryQty, exitQty);
    let realizedPnL = 0;
    if (exitPrice !== null && closedQty > 0) {
      if (isLong) {
        realizedPnL = (exitPrice - entryPrice) * closedQty;
      } else {
        realizedPnL = (entryPrice - exitPrice) * closedQty;
      }
    }
    
    // Commission
    const commission = totalCommission(groupFills);
    realizedPnL -= commission;
    
    // Unrealized P&L (would need current price, assume 0 for now)
    const unrealizedPnL = 0;
    const totalPnL = realizedPnL + unrealizedPnL;
    
    // P&L percent
    const costBasis = entryPrice * closedQty;
    const pnlPercent = costBasis > 0 ? (realizedPnL / costBasis) * 100 : 0;
    
    // Risk calculations (simplified - would need stop price for accurate calc)
    const riskUsed = startingEquity * 0.03; // Assume 3% risk
    const riskPercent = 3;
    
    const trade: Trade = {
      id: generateTradeId(symbol, marketDate, tradeIndex++),
      symbol,
      side: isLong ? 'LONG' : 'SHORT',
      status: isOpen ? 'OPEN' : 'CLOSED',
      
      entryDate,
      entryPrice,
      entryFills,
      
      exitDate,
      exitPrice,
      exitFills,
      
      quantity,
      remainingQty: Math.max(0, remainingQty),
      
      realizedPnL,
      unrealizedPnL,
      totalPnL,
      pnlPercent,
      commission,
      
      riskUsed,
      riskPercent,
      stopPrice: null, // Would need user input or calculation
      
      outcome: determineOutcome(realizedPnL, isOpen),
      
      marketDate,
      durationMinutes: exitDate ? durationMinutes(entryDate, exitDate) : null,
    };
    
    trades.push(trade);
  }
  
  // Sort trades by entry date (most recent first)
  trades.sort((a, b) => b.entryDate.getTime() - a.entryDate.getTime());
  
  return trades;
}

/**
 * Calculate aggregate metrics from trades
 */
export function calculateMetrics(trades: Trade[]) {
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
  
  // Calculate streaks
  let currentStreak = 0;
  let streakType: 'WIN' | 'LOSS' | 'NONE' = 'NONE';
  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;
  let tempWinStreak = 0;
  let tempLossStreak = 0;
  
  // Process trades in chronological order for streaks
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
    profitFactor: Number.isFinite(profitFactor) ? profitFactor : 0,
    maxDrawdownPct: 0, // Will be calculated from equity curve
    currentStreak,
    streakType,
    maxConsecutiveWins,
    maxConsecutiveLosses,
  };
}