import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { Trade } from "../engine/types";
import { computeRiskState, STRATEGY, getCurrentRisk } from "../engine/riskEngine";
import { parseWebullCSV } from "../engine/webullParser";
import { buildTrades } from "../engine/tradesBuilder";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) =>
  readFileSync(resolve(__dirname, "../../testdata", name), "utf8");

// Helper to create a test trade that matches the Trade interface
function makeTrade(pnl: number, exitTs: Date): Trade {
  const entryTs = new Date(exitTs.getTime() - 60_000);
  const entryPrice = 100;
  const qty = 1;
  const exitPrice = entryPrice + pnl;

  // Determine outcome from P&L
  const outcome = pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'BREAKEVEN';

  return {
    id: `T|${exitTs.toISOString()}|${pnl}`,
    symbol: "AAPL",
    side: "LONG",
    status: "CLOSED",
    entryDate: entryTs,
    entryPrice,
    entryFills: [],
    exitDate: exitTs,
    exitPrice,
    exitFills: [],
    quantity: qty,
    remainingQty: 0,
    realizedPnL: pnl,
    unrealizedPnL: 0,
    totalPnL: pnl,
    pnlPercent: entryPrice > 0 ? (pnl / entryPrice) * 100 : 0,
    commission: 0,
    riskUsed: 0,
    riskPercent: 0,
    stopPrice: null,
    outcome,
    marketDate: exitTs.toISOString().split('T')[0],
    durationMinutes: 1,
  };
}

describe("Restart throttle state machine (per-trade)", () => {
  test("no trades -> starts HIGH", () => {
    const r = computeRiskState([], 20000, STRATEGY);
    expect(r.mode).toBe("HIGH");
    expect(r.lowWinsProgress).toBe(0);
    expect(r.todayRiskPct).toBe(STRATEGY.highModeRiskPct);
  });

  test("loss in HIGH -> LOW (immediate next trade)", () => {
    const trades = [makeTrade(-1, new Date("2026-01-02T18:00:00Z"))];
    const r = computeRiskState(trades, 20000, STRATEGY);

    expect(r.mode).toBe("LOW");
    expect(r.lowWinsProgress).toBe(0);
    expect(r.todayRiskPct).toBe(STRATEGY.lowModeRiskPct);
  });

  test("LOW: 2 wins -> HIGH; breakeven ignored", () => {
    const trades = [
      makeTrade(-1, new Date("2026-01-02T18:00:00Z")), // HIGH -> LOW
      makeTrade(+1, new Date("2026-01-02T18:10:00Z")), // LOW progress 1
      makeTrade(0, new Date("2026-01-02T18:20:00Z")), // ignored (breakeven)
      makeTrade(+1, new Date("2026-01-02T18:30:00Z")), // progress 2 -> HIGH
    ];

    const r = computeRiskState(trades, 20000, STRATEGY);
    expect(r.mode).toBe("HIGH");
    expect(r.lowWinsProgress).toBe(0);
    expect(r.todayRiskPct).toBe(STRATEGY.highModeRiskPct);
  });

  test("LOW: loss resets progress to 0", () => {
    const trades = [
      makeTrade(-1, new Date("2026-01-02T18:00:00Z")), // HIGH -> LOW
      makeTrade(+1, new Date("2026-01-02T18:10:00Z")), // progress 1
      makeTrade(-1, new Date("2026-01-02T18:20:00Z")), // reset to 0, stay LOW
    ];

    const r = computeRiskState(trades, 20000, STRATEGY);
    expect(r.mode).toBe("LOW");
    expect(r.lowWinsProgress).toBe(0);
    expect(r.todayRiskPct).toBe(STRATEGY.lowModeRiskPct);
  });

  test("forecast: LOW with 1 win -> next WIN returns HIGH", () => {
    const trades = [
      makeTrade(-1, new Date("2026-01-02T18:00:00Z")), // HIGH -> LOW
      makeTrade(+1, new Date("2026-01-02T18:10:00Z")), // LOW progress 1
    ];

    const r = computeRiskState(trades, 20000, STRATEGY);
    expect(r.mode).toBe("LOW");
    expect(r.lowWinsProgress).toBe(1);
    expect(r.tomorrowIfWinRiskPct).toBe(STRATEGY.highModeRiskPct);
    expect(r.tomorrowIfLossRiskPct).toBe(STRATEGY.lowModeRiskPct);
  });

  test("demo CSV ends in HIGH mode", () => {
    const csv = fixture("demo_high_mode.csv");
    const parsed = parseWebullCSV(csv);
    const { trades } = buildTrades(parsed.fills);

    const risk = getCurrentRisk(trades, 25000, STRATEGY);

    expect(risk.mode).toBe("HIGH");
  });

  test("demo CSV ends in LOW mode", () => {
    const csv = fixture("demo_low_mode.csv");
    const parsed = parseWebullCSV(csv);
    const { trades } = buildTrades(parsed.fills);

    const risk = getCurrentRisk(trades, 25000, STRATEGY);

    expect(risk.mode).toBe("LOW");
  });
});
