import type { Trade, RiskState, StrategyConfig, DailyEquity, ClosedTradeOutcome } from './types';

export const DEFAULT_STRATEGY: StrategyConfig = {
  id: 'restart-throttle',
  name: 'Restart Throttle',
  highModeRiskPct: 0.03,    // 3%
  lowModeRiskPct: 0.001,    // 0.1%
  winsToRecover: 2,
  lossesToDrop: 1,
};

// Re-export for backwards compatibility with tests
export const STRATEGY = DEFAULT_STRATEGY;

/**
 * Mode type for explicit annotation
 */
type RiskMode = 'HIGH' | 'LOW';

/**
 * Ensure input is a valid Trade array - defensive helper
 */
function ensureTradesArray(trades: unknown): Trade[] {
  if (!trades) {
    return [];
  }
  if (Array.isArray(trades)) {
    return trades;
  }
  // Handle case where trades is an object with a 'trades' property
  if (typeof trades === 'object' && 'trades' in trades && Array.isArray((trades as { trades: unknown }).trades)) {
    console.warn('riskEngine: received object with trades property, extracting array');
    return (trades as { trades: Trade[] }).trades;
  }
  console.warn('riskEngine: received non-array trades:', typeof trades);
  return [];
}

/**
 * Calculate risk states for each day based on trade history
 */
export function calculateRiskStates(
  trades: Trade[],
  startingEquity: number,
  strategy: StrategyConfig = DEFAULT_STRATEGY
): RiskState[] {
  // Defensive: ensure trades is an array
  const tradesArray = ensureTradesArray(trades);
  
  // Sort trades chronologically
  const sortedTrades = [...tradesArray]
    .filter(t => t.status === 'CLOSED')
    .sort((a, b) => a.entryDate.getTime() - b.entryDate.getTime());
  
  if (sortedTrades.length === 0) {
    // No trades - return initial HIGH mode state
    const today = new Date().toISOString().split('T')[0];
    return [{
      date: today,
      mode: 'HIGH',
      riskPct: strategy.highModeRiskPct,
      allowedRiskDollars: startingEquity * strategy.highModeRiskPct,
      equity: startingEquity,
      lowWinsProgress: 0,
      lowWinsNeeded: strategy.winsToRecover,
      lastTradeOutcome: null,
    }];
  }
  
  const states: RiskState[] = [];
  // FIX: Explicitly type as RiskMode to prevent over-narrowing
  let currentMode: RiskMode = 'HIGH';
  let lowWinsProgress = 0;
  let equity = startingEquity;
  
  // Group trades by market date
  const tradesByDate = new Map<string, Trade[]>();
  for (const trade of sortedTrades) {
    if (!tradesByDate.has(trade.marketDate)) {
      tradesByDate.set(trade.marketDate, []);
    }
    tradesByDate.get(trade.marketDate)!.push(trade);
  }
  
  // Process each day
  const dates = Array.from(tradesByDate.keys()).sort();
  
  for (const date of dates) {
    const dayTrades = tradesByDate.get(date)!;
    let lastOutcome: ClosedTradeOutcome | null = null;
    
    // Process each trade for that day
    for (const trade of dayTrades) {
      equity += trade.realizedPnL;
      // Only record outcome if it's a closed outcome (not ACTIVE)
      if (trade.outcome !== 'ACTIVE') {
        lastOutcome = trade.outcome;
      }
      
      // Apply strategy rules
      // FIX: Use explicit comparison to prevent type narrowing issues
      const isHighMode = currentMode === 'HIGH';
      
      if (isHighMode) {
        if (trade.outcome === 'LOSS') {
          // Drop to LOW mode
          currentMode = 'LOW';
          lowWinsProgress = 0;
        }
        // Wins and breakeven stay in HIGH
      } else {
        // LOW mode
        if (trade.outcome === 'WIN') {
          lowWinsProgress++;
          if (lowWinsProgress >= strategy.winsToRecover) {
            currentMode = 'HIGH';
            lowWinsProgress = 0;
          }
        } else if (trade.outcome === 'LOSS') {
          // Reset progress
          lowWinsProgress = 0;
        }
        // Breakeven doesn't affect progress
      }
    }
    
    const riskPct = currentMode === 'HIGH' ? strategy.highModeRiskPct : strategy.lowModeRiskPct;
    
    states.push({
      date,
      mode: currentMode,
      riskPct,
      allowedRiskDollars: equity * riskPct,
      equity,
      lowWinsProgress,
      lowWinsNeeded: strategy.winsToRecover,
      lastTradeOutcome: lastOutcome,
    });
  }
  
  return states;
}

/**
 * Return type for getCurrentRisk with forecast
 */
export interface CurrentRiskResult extends RiskState {
  forecast: {
    ifWin: { mode: RiskMode; riskPct: number };
    ifLoss: { mode: RiskMode; riskPct: number };
  };
}

/**
 * Get current risk state (as of today or last trade date)
 */
export function getCurrentRisk(
  trades: Trade[],
  startingEquity: number,
  strategy: StrategyConfig = DEFAULT_STRATEGY
): CurrentRiskResult {
  // Defensive: ensure trades is an array
  const tradesArray = ensureTradesArray(trades);
  
  const states = calculateRiskStates(tradesArray, startingEquity, strategy);
  const lastState = states[states.length - 1] || {
    date: new Date().toISOString().split('T')[0],
    mode: 'HIGH' as RiskMode,
    riskPct: strategy.highModeRiskPct,
    allowedRiskDollars: startingEquity * strategy.highModeRiskPct,
    equity: startingEquity,
    lowWinsProgress: 0,
    lowWinsNeeded: strategy.winsToRecover,
    lastTradeOutcome: null,
  };
  
  // Calculate forecast scenarios
  // FIX: Explicitly type these variables to prevent literal narrowing
  let ifWinMode: RiskMode;
  let ifLossMode: RiskMode;
  
  // FIX: Store mode in local const to avoid narrowing issues
  const currentMode: RiskMode = lastState.mode;
  
  if (currentMode === 'HIGH') {
    ifWinMode = 'HIGH'; // Stays HIGH
    ifLossMode = 'LOW'; // Drops to LOW
  } else {
    // LOW mode
    const winsAfterWin = lastState.lowWinsProgress + 1;
    ifWinMode = winsAfterWin >= strategy.winsToRecover ? 'HIGH' : 'LOW';
    ifLossMode = 'LOW'; // Reset, stay LOW
  }
  
  return {
    ...lastState,
    forecast: {
      ifWin: {
        mode: ifWinMode,
        riskPct: ifWinMode === 'HIGH' ? strategy.highModeRiskPct : strategy.lowModeRiskPct,
      },
      ifLoss: {
        mode: ifLossMode,
        riskPct: strategy.lowModeRiskPct,
      },
    },
  };
}

/**
 * Compute risk state - alias for getCurrentRisk for backwards compatibility with tests
 */
export function computeRiskState(
  trades: Trade[],
  startingEquity: number,
  strategy: StrategyConfig = DEFAULT_STRATEGY
): {
  mode: RiskMode;
  lowWinsProgress: number;
  todayRiskPct: number;
  tomorrowIfWinRiskPct: number;
  tomorrowIfLossRiskPct: number;
} {
  const result = getCurrentRisk(trades, startingEquity, strategy);
  return {
    mode: result.mode,
    lowWinsProgress: result.lowWinsProgress,
    todayRiskPct: result.riskPct,
    tomorrowIfWinRiskPct: result.forecast.ifWin.riskPct,
    tomorrowIfLossRiskPct: result.forecast.ifLoss.riskPct,
  };
}

/**
 * Calculate daily equity curve
 */
export function calculateDailyEquity(
  trades: Trade[],
  startingEquity: number
): DailyEquity[] {
  // Defensive: ensure trades is an array
  const tradesArray = ensureTradesArray(trades);
  
  const sortedTrades = [...tradesArray]
    .filter(t => t.status === 'CLOSED')
    .sort((a, b) => a.entryDate.getTime() - b.entryDate.getTime());
  
  if (sortedTrades.length === 0) {
    return [];
  }
  
  // Group by date
  const tradesByDate = new Map<string, Trade[]>();
  for (const trade of sortedTrades) {
    if (!tradesByDate.has(trade.marketDate)) {
      tradesByDate.set(trade.marketDate, []);
    }
    tradesByDate.get(trade.marketDate)!.push(trade);
  }
  
  const equityCurve: DailyEquity[] = [];
  let cumulativeEquity = startingEquity;
  let peakEquity = startingEquity;
  let cumulativePnL = 0;
  
  const dates = Array.from(tradesByDate.keys()).sort();
  
  for (const date of dates) {
    const dayTrades = tradesByDate.get(date)!;
    const dayPnL = dayTrades.reduce((sum, t) => sum + t.realizedPnL, 0);
    const wins = dayTrades.filter(t => t.outcome === 'WIN').length;
    const losses = dayTrades.filter(t => t.outcome === 'LOSS').length;
    
    cumulativeEquity += dayPnL;
    cumulativePnL += dayPnL;
    peakEquity = Math.max(peakEquity, cumulativeEquity);
    
    const drawdownPct = peakEquity > 0 ? (cumulativeEquity - peakEquity) / peakEquity : 0;
    
    equityCurve.push({
      date,
      tradingEquity: cumulativeEquity,
      accountEquity: cumulativeEquity, // Same for now, adjustments come in Step 3
      dayPnL,
      cumulativePnL,
      drawdownPct,
      peakEquity,
      tradeCount: dayTrades.length,
      winCount: wins,
      lossCount: losses,
    });
  }
  
  return equityCurve;
}

/**
 * Calculate max drawdown from equity curve
 */
export function calculateMaxDrawdown(equityCurve: DailyEquity[]): number {
  if (!Array.isArray(equityCurve) || equityCurve.length === 0) return 0;
  return Math.min(...equityCurve.map(d => d.drawdownPct));
}
