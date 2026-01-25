import type { RiskMode, RiskState, StrategyConfig, Trade } from "../types/models";
import { dateKeyMarket, nextBusinessDay } from "../utils/dates";

/**
 * Restart throttle (v1) — per-trade state machine.
 *
 * Rules (as agreed):
 * - Start in HIGH
 * - Win/Loss is per trade: pnl > 0 win, pnl < 0 loss, pnl == 0 ignored
 * - In HIGH: losses drop you to LOW (default: 1 loss; configurable via highLossesNeeded)
 * - In LOW: only wins count; 2 wins returns you to HIGH (configurable via lowWinsNeeded)
 * - Loss in LOW resets low-wins progress to 0
 * - Switch applies immediately to the next trade (no next-day deferral)
 */

export const STRATEGY: StrategyConfig = {
  lowRiskPct: 0.001, // 0.10%
  highRiskPct: 0.03, // 3.00%
  lowWinsNeeded: 2,
  highLossesNeeded: 1,
};

type Outcome = "WIN" | "LOSS" | "BREAKEVEN";

type InternalState = {
  mode: RiskMode;
  lowWinsProgress: number;
  // Only used while in HIGH when highLossesNeeded > 1.
  highLossesStreak: number;
};

function outcomeFromPnl(pnl: number): Outcome {
  if (pnl > 0) return "WIN";
  if (pnl < 0) return "LOSS";
  return "BREAKEVEN";
}

function applyOutcome(state: InternalState, outcome: Outcome, cfg: StrategyConfig): InternalState {
  if (outcome === "BREAKEVEN") return state;

  if (state.mode === "HIGH") {
    if (outcome === "WIN") {
      // wins don't matter in HIGH, but they break a loss streak if using >1 losses.
      return { ...state, highLossesStreak: 0 };
    }

    // LOSS while in HIGH
    const nextStreak = state.highLossesStreak + 1;
    if (nextStreak >= cfg.highLossesNeeded) {
      return { mode: "LOW", lowWinsProgress: 0, highLossesStreak: 0 };
    }

    return { ...state, highLossesStreak: nextStreak };
  }

  // LOW mode
  if (outcome === "LOSS") {
    // loss in LOW resets progress
    return { ...state, lowWinsProgress: 0, highLossesStreak: 0 };
  }

  // WIN while in LOW
  const nextProgress = state.lowWinsProgress + 1;
  if (nextProgress >= cfg.lowWinsNeeded) {
    return { mode: "HIGH", lowWinsProgress: 0, highLossesStreak: 0 };
  }

  return { ...state, lowWinsProgress: nextProgress, highLossesStreak: 0 };
}

function pctForMode(mode: RiskMode, cfg: StrategyConfig): number {
  return mode === "HIGH" ? cfg.highRiskPct : cfg.lowRiskPct;
}

/**
 * Computes the throttle state "as-of" the most recent completed trade.
 *
 * Notes:
 * - Trades are processed in chronological EXIT order.
 * - The resulting mode is the mode to use for the *next* trade.
 */
export function computeRiskState(trades: Trade[], startingEquity: number, cfg: StrategyConfig): RiskState {
  const startEq = Number.isFinite(startingEquity) ? startingEquity : 0;

  const sorted = [...trades].sort((a, b) => a.exitTs.getTime() - b.exitTs.getTime());

  let state: InternalState = { mode: "HIGH", lowWinsProgress: 0, highLossesStreak: 0 };
  let equityAsOfClose = startEq;
  let asOfCloseDate: string | null = null;

  for (const t of sorted) {
    equityAsOfClose += t.pnl;
    asOfCloseDate = t.exitDate;
    state = applyOutcome(state, outcomeFromPnl(t.pnl), cfg);
  }

  // UI dates: treat "today" as the current market date.
  const todayDate = dateKeyMarket(new Date());
  const tomorrowDate = nextBusinessDay(todayDate);

  const todayRiskPct = pctForMode(state.mode, cfg);
  const allowedRiskDollars = equityAsOfClose * todayRiskPct;

  const winNext = applyOutcome(state, "WIN", cfg);
  const lossNext = applyOutcome(state, "LOSS", cfg);

  return {
    mode: state.mode,
    lowWinsProgress: state.lowWinsProgress,

    asOfCloseDate,
    todayDate,
    tomorrowDate,

    todayRiskPct,
    tomorrowBaseRiskPct: todayRiskPct,
    tomorrowIfWinRiskPct: pctForMode(winNext.mode, cfg),
    tomorrowIfLossRiskPct: pctForMode(lossNext.mode, cfg),

    equityAsOfClose,
    allowedRiskDollars,
  };
}
