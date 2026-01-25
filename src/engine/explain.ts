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
  const winsToRecover = Math.max(1, Math.floor(cfg.lowWinsNeeded));

  if (risk.mode === "HIGH") {
    const dropLine =
      lossesToDrop === 1
        ? "A single losing trade drops you to LOW."
        : `${lossesToDrop} consecutive losing trades drop you to LOW.`;

    const baseReason =
      risk.asOfCloseDate == null
        ? "No completed trades yet — strategy defaults to HIGH."
        : "Mode is HIGH as-of the most recent closed trade.";

    return {
      title: "HIGH mode",
      subtitle: "Full risk allowed (Restart throttle).",
      bullets: [
        baseReason,
        dropLine,
        `Allowed risk right now: ${allowed} (equity ${equity}).`,
      ],
      footer: "Breakeven trades (P&L = 0) are ignored for all counters.",
    };
  }

  // LOW
  const need = Math.max(0, winsToRecover - risk.lowWinsProgress);

  return {
    title: "LOW mode",
    subtitle: "Throttle engaged — you must earn wins back to regain HIGH.",
    bullets: [
      `Wins earned in LOW: ${risk.lowWinsProgress}/${winsToRecover}.`,
      `You need ${need} more winning trade${need === 1 ? "" : "s"} to return to HIGH.`,
      "Any losing trade in LOW resets win progress back to 0.",
      `Allowed risk right now: ${allowed} (equity ${equity}).`,
    ],
    footer: "Breakeven trades (P&L = 0) are ignored for all counters.",
  };
}
