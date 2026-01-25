import type { RiskMode, RiskState, StrategyConfig, Trade } from "../types/models";
import { dateKeyMarket, nextBusinessDay } from "../utils/dates";

export const STRATEGY: StrategyConfig = {
  lowRiskPct: 0.001, // 0.10%
  highRiskPct: 0.03, // 3.00%
  lowWinsNeeded: 2,
  highLossesNeeded: 1,
};

type Outcome = "WIN" | "LOSS" | "BREAKEVEN";

type InternalState = {
  mode: RiskMode;
  lowWinsProgress: number; // only meaningful in LOW
  highLossesStreak: number; // only meaningful in HIGH (consecutive losses)
};

function outcomeFromPnl(pnl: number): Outcome {
  if (pnl > 0) return "WIN";
  if (pnl < 0) return "LOSS";
  return "BREAKEVEN";
}

function applyOutcome(state: InternalState, outcome: Outcome, cfg: StrategyConfig): InternalState {
  if (outcome === "BREAKEVEN") return state;

  const lossesToDrop = Math.max(1, Math.floor(cfg.highLossesNeeded));
  const winsToRecover = Math.max(1, Math.floor(cfg.lowWinsNeeded));

  if (state.mode === "HIGH") {
    if (outcome === "WIN") {
      return { ...state, highLossesStreak: 0 };
    }

    const nextLossStreak = state.highLossesStreak + 1;
    if (nextLossStreak >= lossesToDrop) {
      return { mode: "LOW", lowWinsProgress: 0, highLossesStreak: 0 };
    }
    return { ...state, highLossesStreak: nextLossStreak };
  }

  // LOW
  if (outcome === "LOSS") {
    return { ...state, lowWinsProgress: 0, highLossesStreak: 0 };
  }

  // WIN in LOW
  const nextWins = state.lowWinsProgress + 1;
  if (nextWins >= winsToRecover) {
    return { mode: "HIGH", lowWinsProgress: 0, highLossesStreak: 0 };
  }
  return { ...state, lowWinsProgress: nextWins, highLossesStreak: 0 };
}

export function computeRiskState(
  trades: Trade[],
  startingEquity: number,
  cfg: StrategyConfig
): RiskState {
  const sorted = [...trades].sort((a, b) => a.exitTs.getTime() - b.exitTs.getTime());

  let state: InternalState = { mode: "HIGH", lowWinsProgress: 0, highLossesStreak: 0 };

  let equityAsOfClose = Number.isFinite(startingEquity) ? startingEquity : 0;
  let asOfCloseDate: string | null = null;

  for (const t of sorted) {
    equityAsOfClose += t.pnl;
    asOfCloseDate = t.exitDate;
    state = applyOutcome(state, outcomeFromPnl(t.pnl), cfg);
  }

  const todayDate = dateKeyMarket(new Date());
  const tomorrowDate = nextBusinessDay(todayDate);

  const todayRiskPct = state.mode === "HIGH" ? cfg.highRiskPct : cfg.lowRiskPct;
  const allowedRiskDollars = equityAsOfClose * todayRiskPct;

  const stateIfWin = applyOutcome(state, "WIN", cfg);
  const stateIfLoss = applyOutcome(state, "LOSS", cfg);

  const tomorrowBaseRiskPct = todayRiskPct;
  const tomorrowIfWinRiskPct = stateIfWin.mode === "HIGH" ? cfg.highRiskPct : cfg.lowRiskPct;
  const tomorrowIfLossRiskPct = stateIfLoss.mode === "HIGH" ? cfg.highRiskPct : cfg.lowRiskPct;

  return {
    mode: state.mode,
    lowWinsProgress: state.lowWinsProgress,
    asOfCloseDate,
    todayDate,
    tomorrowDate,
    todayRiskPct,
    tomorrowBaseRiskPct,
    tomorrowIfWinRiskPct,
    tomorrowIfLossRiskPct,
    equityAsOfClose,
    allowedRiskDollars,
  };
}
