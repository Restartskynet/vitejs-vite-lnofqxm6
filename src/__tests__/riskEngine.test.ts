import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { Trade } from "../engine/types";
import { applyDailyDirectives, computeRiskState, STRATEGY, getCurrentRisk } from "../engine/riskEngine";
import { parseWebullCSV } from "../engine/webullParser";
import { buildTrades } from "../engine/tradesBuilder";
import { epochDayToIso, isoToEpochDay, toETDateKey } from "../lib/dateKey";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) =>
  readFileSync(resolve(__dirname, "../../testdata", name), "utf8");

// Helper to create a test trade that matches the Trade interface
function makeTrade(pnl: number, exitTs: Date): Trade {
  const entryTs = new Date(exitTs.getTime() - 60_000);
  const entryPrice = 100;
  const qty = 1;
  const exitPrice = entryPrice + pnl;
  const entryDayKey = toETDateKey(entryTs);
  const exitDayKey = toETDateKey(exitTs);

  // Determine outcome from P&L
  const outcome = pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'BREAKEVEN';

  return {
    id: `T|${exitTs.toISOString()}|${pnl}`,
    symbol: "AAPL",
    side: "LONG",
    status: "CLOSED",
    entryDate: entryTs,
    entryDayKey,
    entryPrice,
    entryFills: [],
    exitDate: exitTs,
    exitDayKey,
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
    modeAtEntry: "HIGH",
    riskPctAtEntry: 0,
    equityAtEntry: 0,
    riskDollarsAtEntry: 0,
    causedModeSwitch: false,
    outcome,
    marketDate: toETDateKey(exitTs),
    durationMinutes: 1,
  };
}

describe("Restart throttle state machine (per-trade)", () => {
  const fixedNow = new Date("2030-01-04T15:00:00Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("no trades -> starts HIGH", () => {
    const r = computeRiskState([], 20000, STRATEGY);
    expect(r.mode).toBe("HIGH");
    expect(r.lowWinsProgress).toBe(0);
    expect(r.todayRiskPct).toBe(STRATEGY.highModeRiskPct);
  });

  test("loss in HIGH -> LOW (next day)", () => {
    const trades = [makeTrade(-1, new Date("2026-01-02T18:00:00Z"))];
    const r = computeRiskState(trades, 20000, STRATEGY);

    expect(r.mode).toBe("LOW");
    expect(r.lowWinsProgress).toBe(0);
    expect(r.todayRiskPct).toBe(STRATEGY.lowModeRiskPct);
  });

  test("LOW: 2 wins (including breakeven) -> HIGH", () => {
    const trades = [
      makeTrade(-1, new Date("2026-01-01T18:00:00Z")), // HIGH -> LOW for 1/2
      makeTrade(+1, new Date("2026-01-02T18:10:00Z")), // LOW progress 1 for 1/3
      makeTrade(0, new Date("2026-01-03T18:20:00Z")), // qualifies but does not flip by itself
      makeTrade(+1, new Date("2026-01-03T18:30:00Z")), // progress 2 -> HIGH for 1/4
    ];

    const r = computeRiskState(trades, 20000, STRATEGY);
    expect(r.mode).toBe("HIGH");
    expect(r.lowWinsProgress).toBe(0);
    expect(r.todayRiskPct).toBe(STRATEGY.highModeRiskPct);
  });

  test("LOW: loss resets progress to 0", () => {
    const trades = [
      makeTrade(-1, new Date("2026-01-01T18:00:00Z")), // HIGH -> LOW for 1/2
      makeTrade(+1, new Date("2026-01-02T18:10:00Z")), // progress 1 for 1/3
      makeTrade(-1, new Date("2026-01-03T18:20:00Z")), // reset for 1/4
    ];

    const r = computeRiskState(trades, 20000, STRATEGY);
    expect(r.mode).toBe("LOW");
    expect(r.lowWinsProgress).toBe(0);
    expect(r.todayRiskPct).toBe(STRATEGY.lowModeRiskPct);
  });

  test("forecast: LOW with 1 win -> next WIN returns HIGH", () => {
    const trades = [
      makeTrade(-1, new Date("2026-01-01T18:00:00Z")), // HIGH -> LOW for 1/2
      makeTrade(+1, new Date("2026-01-02T18:10:00Z")), // LOW progress 1 for 1/3
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

  test("demo CSV ends in HIGH mode with daily lock", () => {
    const csv = fixture("demo_low_mode.csv");
    const parsed = parseWebullCSV(csv);
    const { trades } = buildTrades(parsed.fills);

    const risk = getCurrentRisk(trades, 25000, STRATEGY);

    expect(risk.mode).toBe("HIGH");
  });

  test("auto daily + loss dominance locks entries and forces next day LOW", () => {
    const day = "2026-01-02";
    const lossExit = new Date(`${day}T15:00:00Z`);
    const winExit1 = new Date(`${day}T18:00:00Z`);
    const winExit2 = new Date(`${day}T19:00:00Z`);

    const trades = [
      makeTrade(-5, lossExit),
      makeTrade(5, winExit1),
      makeTrade(8, winExit2),
    ];

    const tomorrowKey = epochDayToIso(isoToEpochDay(day) + 1);
    const { directives, assignments } = applyDailyDirectives(trades, 20000, STRATEGY, tomorrowKey);
    const tomorrowDirective = directives.find((directive) => directive.date === tomorrowKey);

    expect(assignments.get(trades[0].id)?.riskPctAtEntry).toBe(STRATEGY.highModeRiskPct);
    expect(assignments.get(trades[1].id)?.riskPctAtEntry).toBe(STRATEGY.highModeRiskPct);
    expect(assignments.get(trades[2].id)?.riskPctAtEntry).toBe(STRATEGY.highModeRiskPct);
    expect(tomorrowDirective?.mode).toBe("LOW");
    expect(tomorrowDirective?.lowWinsProgress).toBe(0);
  });
});
