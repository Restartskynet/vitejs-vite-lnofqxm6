import type { RiskState, StrategyConfig } from "../types/models";
import { fmtMoney } from "../utils/numbers";

export function explainMode(
  risk: RiskState,
  cfg: StrategyConfig
): {
  title: string;
  subtitle: string;
  bullets: string[];
  footer: string;
} {
  const allowed = fmtMoney(risk.allowedRiskDollars);
  const equity = fmtMoney(risk.equityAsOfClose);

  const lossesToDrop = Math.max(1, Math.floor(cfg.highLossesNeeded));
  const winsToReturn = Math.max(1, Math.floor(cfg.lowWinsNeeded));

  if (risk.mode === "HIGH") {
    const lossLine =
      lossesToDrop === 1
        ? "One losing trade drops you to LOW."
        : `${lossesToDrop} consecutive losing trades drop you to LOW.`;

    const reason =
      risk.asOfCloseDate == null
        ? "No completed trades yet — the strategy defaults to HIGH."
        : "Mode is HIGH based on your most recent closed trade(s).";

    return {
      title: "HIGH mode",
      subtitle: "Use your full risk allocation.",
      bullets: [
        `Risk today: ${(cfg.highRiskPct * 100).toFixed(2)}% of equity (${allowed}).`,
        lossLine,
        "Wins in HIGH do not change the mode.",
        `Equity used: ${equity} (starting equity + realized P&L as of last closed trade).`,
        reason,
      ],
      footer: "This is a per-trade throttle: the next trade after a mode switch uses the new mode.",
    };
  }

  // LOW
  const remaining = Math.max(0, winsToReturn - risk.lowWinsProgress);

  return {
    title: "LOW mode",
    subtitle: "Rebuild confidence with tiny risk.",
    bullets: [
      `Risk today: ${(cfg.lowRiskPct * 100).toFixed(2)}% of equity (${allowed}).`,
      `Progress: ${risk.lowWinsProgress}/${winsToReturn} winning trades needed to return to HIGH.`,
      "A losing trade resets the win progress back to 0.",
      "Breakeven trades (P&L = 0) are ignored.",
      `Wins remaining to return to HIGH: ${remaining}.`,
      `Equity used: ${equity} (starting equity + realized P&L as of last closed trade).`,
    ],
    footer: "This is a per-trade throttle: the next trade after a mode switch uses the new mode.",
  };
}
