import type { DailyRow, RiskMode, RiskState, StrategyConfig } from "../types/models";
import { dateKeyMarket, nextBusinessDay } from "../utils/dates";

function applyCloseDayTransition(
  mode: RiskMode,
  lowWinsProgress: number,
  wins: number,
  losses: number,
  cfg: StrategyConfig
): { mode: RiskMode; lowWinsProgress: number } {
  if (mode === "LOW") {
    const nextWins = lowWinsProgress + wins;
    if (nextWins >= cfg.lowWinsNeeded) {
      return { mode: "HIGH", lowWinsProgress: 0 };
    }
    return { mode: "LOW", lowWinsProgress: nextWins };
  }

  if (losses >= cfg.highLossesNeeded) {
    return { mode: "LOW", lowWinsProgress: 0 };
  }

  return { mode: "HIGH", lowWinsProgress: 0 };
}

export function computeRiskState(
  daily: DailyRow[],
  startingEquity: number,
  cfg: StrategyConfig
): RiskState {
  if (daily.length === 0) {
    const todayKey = dateKeyMarket(new Date());
    const tomorrowKey = nextBusinessDay(todayKey);

    const todayRiskPct = cfg.lowRiskPct;
    const equityAsOfClose = startingEquity;
    const allowedRiskDollars = equityAsOfClose * todayRiskPct;

    return {
      mode: "LOW",
      lowWinsProgress: 0,
      asOfCloseDate: null,

      todayDate: todayKey,
      tomorrowDate: tomorrowKey,

      todayRiskPct,
      tomorrowBaseRiskPct: todayRiskPct,
      tomorrowIfWinRiskPct: todayRiskPct,
      tomorrowIfLossRiskPct: todayRiskPct,

      equityAsOfClose,
      allowedRiskDollars,
    };
  }

  let mode: RiskMode = "LOW";
  let lowWinsProgress = 0;

  for (const d of daily) {
    const next = applyCloseDayTransition(mode, lowWinsProgress, d.wins, d.losses, cfg);
    mode = next.mode;
    lowWinsProgress = next.lowWinsProgress;
  }

  const asOfCloseDate = daily[daily.length - 1].date;
  const todayDate = nextBusinessDay(asOfCloseDate);
  const tomorrowDate = nextBusinessDay(todayDate);

  const todayRiskPct = mode === "LOW" ? cfg.lowRiskPct : cfg.highRiskPct;

  const tomorrowBaseRiskPct = todayRiskPct;

  const winScenario = applyCloseDayTransition(mode, lowWinsProgress, 1, 0, cfg);
  const lossScenario = applyCloseDayTransition(mode, lowWinsProgress, 0, 1, cfg);

  const tomorrowIfWinRiskPct =
    winScenario.mode === "LOW" ? cfg.lowRiskPct : cfg.highRiskPct;

  const tomorrowIfLossRiskPct =
    lossScenario.mode === "LOW" ? cfg.lowRiskPct : cfg.highRiskPct;

  const equityAsOfClose = daily[daily.length - 1].accountEquity;
  const allowedRiskDollars = equityAsOfClose * todayRiskPct;

  return {
    mode,
    lowWinsProgress,
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
