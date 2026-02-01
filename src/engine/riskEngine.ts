import type { Trade, RiskState, StrategyConfig, DailyEquity } from './types';
import { epochDayToIso, isoToEpochDay, toETDateKey } from '../lib/dateKey';

export const DEFAULT_STRATEGY: StrategyConfig = {
  id: 'restart-throttle',
  name: 'Restart Throttle',
  highModeRiskPct: 0.03, // 3%
  lowModeRiskPct: 0.001, // 0.1%
  winsToRecover: 2,
  lossesToDrop: 1,
};

// Re-export for backwards compatibility with tests
export const STRATEGY = DEFAULT_STRATEGY;

type RiskMode = 'HIGH' | 'LOW';

interface DailyDirective {
  date: string;
  mode: RiskMode;
  riskPct: number;
  equityAvailable: number;
  lowWinsProgress: number;
}

export interface RiskAssignment {
  modeAtEntry: RiskMode;
  riskPctAtEntry: number;
  equityAtEntry: number;
  riskDollarsAtEntry: number;
}

function ensureTradesArray(trades: unknown): Trade[] {
  if (!trades) {
    return [];
  }
  if (Array.isArray(trades)) {
    return trades;
  }
  if (typeof trades === 'object' && 'trades' in trades && Array.isArray((trades as { trades: unknown }).trades)) {
    console.warn('riskEngine: received object with trades property, extracting array');
    return (trades as { trades: Trade[] }).trades;
  }
  console.warn('riskEngine: received non-array trades:', typeof trades);
  return [];
}

function clampDateRange(minDate: string, maxDate: string): string[] {
  const startEpoch = isoToEpochDay(minDate);
  const endEpoch = isoToEpochDay(maxDate);
  const out: string[] = [];
  for (let day = startEpoch; day <= endEpoch; day++) {
    out.push(epochDayToIso(day));
  }
  return out;
}

function sortTradesByExit(trades: Trade[]): Trade[] {
  return [...trades].sort((a, b) => {
    const aTime = a.exitDate?.getTime() ?? 0;
    const bTime = b.exitDate?.getTime() ?? 0;
    return aTime - bTime;
  });
}

export function applyDailyDirectives(
  trades: Trade[],
  startingEquity: number,
  strategy: StrategyConfig = DEFAULT_STRATEGY,
  asOfDate?: string
): { directives: DailyDirective[]; assignments: Map<string, RiskAssignment>; modeSwitches: Map<string, boolean> } {
  const tradesArray = ensureTradesArray(trades);
  const closedTrades = tradesArray.filter((trade) => trade.status === 'CLOSED');
  const entryDates = tradesArray.map((trade) => trade.entryDayKey).filter((date): date is string => Boolean(date));
  const exitDates = closedTrades.map((trade) => trade.exitDayKey).filter((date): date is string => Boolean(date));

  const todayKey = asOfDate ?? toETDateKey(new Date());
  const minDate = [todayKey, ...entryDates, ...exitDates].sort()[0];
  const maxDate = [todayKey, ...entryDates, ...exitDates].sort().slice(-1)[0];

  const days = clampDateRange(minDate, maxDate);

  const tradesByEntryDay = new Map<string, Trade[]>();
  const tradesByExitDay = new Map<string, Trade[]>();

  for (const trade of tradesArray) {
    if (!tradesByEntryDay.has(trade.entryDayKey)) {
      tradesByEntryDay.set(trade.entryDayKey, []);
    }
    tradesByEntryDay.get(trade.entryDayKey)!.push(trade);
  }

  for (const trade of closedTrades) {
    if (!trade.exitDayKey) continue;
    if (!tradesByExitDay.has(trade.exitDayKey)) {
      tradesByExitDay.set(trade.exitDayKey, []);
    }
    tradesByExitDay.get(trade.exitDayKey)!.push(trade);
  }

  let mode: RiskMode = 'HIGH';
  let lowWinsProgress = 0;
  let equityAvailable = startingEquity;

  const assignments = new Map<string, RiskAssignment>();
  const modeSwitches = new Map<string, boolean>();
  const directives: DailyDirective[] = [];

  for (const day of days) {
    const riskPct = mode === 'HIGH' ? strategy.highModeRiskPct : strategy.lowModeRiskPct;

    directives.push({
      date: day,
      mode,
      riskPct,
      equityAvailable,
      lowWinsProgress,
    });

    const entryTrades = tradesByEntryDay.get(day) ?? [];
    for (const trade of entryTrades) {
      assignments.set(trade.id, {
        modeAtEntry: mode,
        riskPctAtEntry: riskPct,
        equityAtEntry: equityAvailable,
        riskDollarsAtEntry: equityAvailable * riskPct,
      });
    }

    const exitTrades = sortTradesByExit(tradesByExitDay.get(day) ?? []);

    const hadLossOnDay = exitTrades.some((trade) => trade.realizedPnL < 0);
    const qualifyingWins = exitTrades.filter((trade) => {
      const modeAtEntry = assignments.get(trade.id)?.modeAtEntry ?? trade.modeAtEntry;
      return trade.realizedPnL >= 0 && modeAtEntry === 'LOW';
    });
    const qualifyingWinsOnDay = qualifyingWins.length;

    let nextMode: RiskMode = mode;
    let nextLowWinsProgress = lowWinsProgress;
    let switchTradeId: string | null = null;

    if (hadLossOnDay) {
      nextMode = mode === 'HIGH' ? 'LOW' : 'LOW';
      nextLowWinsProgress = 0;
      if (mode === 'HIGH') {
        const lossTrade = exitTrades.find((trade) => trade.realizedPnL < 0);
        switchTradeId = lossTrade?.id ?? null;
      }
    } else if (mode === 'LOW') {
      const needed = Math.max(strategy.winsToRecover - lowWinsProgress, 0);
      nextLowWinsProgress = lowWinsProgress + qualifyingWinsOnDay;
      if (nextLowWinsProgress >= strategy.winsToRecover) {
        nextMode = 'HIGH';
        if (needed > 0 && qualifyingWins.length >= needed) {
          switchTradeId = qualifyingWins[needed - 1]?.id ?? null;
        }
        nextLowWinsProgress = 0;
      }
    }

    if (switchTradeId && nextMode !== mode) {
      modeSwitches.set(switchTradeId, true);
    }

    mode = nextMode;
    lowWinsProgress = nextLowWinsProgress;

    const dayPnL = exitTrades.reduce((sum, trade) => sum + trade.realizedPnL, 0);
    equityAvailable += dayPnL;
  }

  return { directives, assignments, modeSwitches };
}

export function calculateRiskStates(
  trades: Trade[],
  startingEquity: number,
  strategy: StrategyConfig = DEFAULT_STRATEGY
): RiskState[] {
  const tradesArray = ensureTradesArray(trades);
  const { directives } = applyDailyDirectives(tradesArray, startingEquity, strategy);

  if (directives.length === 0) {
    const today = toETDateKey(new Date());
    return [
      {
        date: today,
        mode: 'HIGH',
        riskPct: strategy.highModeRiskPct,
        allowedRiskDollars: startingEquity * strategy.highModeRiskPct,
        equity: startingEquity,
        lowWinsProgress: 0,
        lowWinsNeeded: strategy.winsToRecover,
        lastTradeOutcome: null,
      },
    ];
  }

  return directives.map((directive) => ({
    date: directive.date,
    mode: directive.mode,
    riskPct: directive.riskPct,
    allowedRiskDollars: directive.equityAvailable * directive.riskPct,
    equity: directive.equityAvailable,
    lowWinsProgress: directive.lowWinsProgress,
    lowWinsNeeded: strategy.winsToRecover,
    lastTradeOutcome: null,
  }));
}

export interface CurrentRiskResult extends RiskState {
  forecast: {
    ifWin: { mode: RiskMode; riskPct: number };
    ifLoss: { mode: RiskMode; riskPct: number };
  };
}

export function getCurrentRisk(
  trades: Trade[],
  startingEquity: number,
  strategy: StrategyConfig = DEFAULT_STRATEGY
): CurrentRiskResult {
  const tradesArray = ensureTradesArray(trades);
  const todayKey = toETDateKey(new Date());
  const { directives } = applyDailyDirectives(tradesArray, startingEquity, strategy, todayKey);
  const todayDirective = directives.find((directive) => directive.date === todayKey) ?? directives[directives.length - 1];

  const defaultDirective: DailyDirective = {
    date: todayKey,
    mode: 'HIGH',
    riskPct: strategy.highModeRiskPct,
    equityAvailable: startingEquity,
    lowWinsProgress: 0,
  };

  const current = todayDirective ?? defaultDirective;

  let ifWinMode: RiskMode = current.mode;
  let ifLossMode: RiskMode = current.mode;

  if (current.mode === 'HIGH') {
    ifLossMode = 'LOW';
  } else {
    ifWinMode = current.lowWinsProgress + 1 >= strategy.winsToRecover ? 'HIGH' : 'LOW';
  }

  return {
    date: current.date,
    mode: current.mode,
    riskPct: current.riskPct,
    allowedRiskDollars: current.equityAvailable * current.riskPct,
    equity: current.equityAvailable,
    lowWinsProgress: current.lowWinsProgress,
    lowWinsNeeded: strategy.winsToRecover,
    lastTradeOutcome: null,
    forecast: {
      ifWin: {
        mode: ifWinMode,
        riskPct: ifWinMode === 'HIGH' ? strategy.highModeRiskPct : strategy.lowModeRiskPct,
      },
      ifLoss: {
        mode: ifLossMode,
        riskPct: ifLossMode === 'HIGH' ? strategy.highModeRiskPct : strategy.lowModeRiskPct,
      },
    },
  };
}

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

export function calculateDailyEquity(trades: Trade[], startingEquity: number): DailyEquity[] {
  const tradesArray = ensureTradesArray(trades);

  const sortedTrades = [...tradesArray]
    .filter((trade) => trade.status === 'CLOSED')
    .sort((a, b) => (a.exitDate?.getTime() ?? 0) - (b.exitDate?.getTime() ?? 0));

  if (sortedTrades.length === 0) {
    return [];
  }

  const tradesByDate = new Map<string, Trade[]>();
  for (const trade of sortedTrades) {
    const key = trade.exitDayKey ?? trade.marketDate;
    if (!tradesByDate.has(key)) {
      tradesByDate.set(key, []);
    }
    tradesByDate.get(key)!.push(trade);
  }

  const equityCurve: DailyEquity[] = [];
  let cumulativeEquity = startingEquity;
  let peakEquity = startingEquity;
  let cumulativePnL = 0;

  const dates = Array.from(tradesByDate.keys()).sort();

  for (const date of dates) {
    const dayTrades = tradesByDate.get(date)!;
    const dayPnL = dayTrades.reduce((sum, trade) => sum + trade.realizedPnL, 0);
    const wins = dayTrades.filter((trade) => trade.realizedPnL >= 0).length;
    const losses = dayTrades.filter((trade) => trade.realizedPnL < 0).length;

    cumulativeEquity += dayPnL;
    cumulativePnL += dayPnL;
    peakEquity = Math.max(peakEquity, cumulativeEquity);

    const drawdownPct = peakEquity > 0 ? (cumulativeEquity - peakEquity) / peakEquity : 0;

    equityCurve.push({
      date,
      tradingEquity: cumulativeEquity,
      accountEquity: cumulativeEquity,
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

export function calculateMaxDrawdown(equityCurve: DailyEquity[]): number {
  if (!Array.isArray(equityCurve) || equityCurve.length === 0) return 0;
  return Math.min(...equityCurve.map((d) => d.drawdownPct));
}
