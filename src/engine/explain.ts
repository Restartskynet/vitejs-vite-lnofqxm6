import type { RiskState, StrategyConfig } from "../types/models";

export function explainMode(risk: RiskState, cfg: StrategyConfig): string[] {
  const lines: string[] = [];

  if (risk.mode === "LOW") {
    lines.push(`YOU ARE IN LOW RISK (${(cfg.lowRiskPct * 100).toFixed(2)}%)`);
    lines.push(
      `REASON: ${risk.lowWinsProgress === 0 ? "Starting state or recent loss" : "Building wins"}`
    );
    lines.push(`RESTORE: ${cfg.lowWinsNeeded} wins required`);
    lines.push(`PROGRESS: ${risk.lowWinsProgress} / ${cfg.lowWinsNeeded} wins`);
  } else {
    lines.push(`YOU ARE IN HIGH RISK (${(cfg.highRiskPct * 100).toFixed(2)}%)`);
    lines.push(`REASON: Achieved ${cfg.lowWinsNeeded} wins in LOW`);
    lines.push(`CAUTION: Any loss drops to LOW`);
    lines.push(`TRIGGER: 0 / ${cfg.highLossesNeeded} losses`);
  }

  return lines;
}
