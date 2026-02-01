import { describe, expect, test } from "vitest";

import type { Trade } from "../engine/types";
import { applyDailyDirectives, getCurrentRisk, STRATEGY } from "../engine/riskEngine";
import { calculateMetrics } from "../engine/tradesBuilder";
import { toETDateKey } from "../lib/dateKey";
import { formatPercent } from "../lib/utils";

const makeDate = (day: string, time: string) => new Date(`${day}T${time}Z`);

function makeTrade(
  id: string,
  entryDay: string,
  exitDay: string | null,
  realizedPnL: number,
  modeAtEntry: "HIGH" | "LOW" = "HIGH"
): Trade {
  const entryDate = makeDate(entryDay, "14:30:00");
  const exitDate = exitDay ? makeDate(exitDay, "15:30:00") : null;
  const status = exitDate ? "CLOSED" : "ACTIVE";
  const outcome = status === "CLOSED" ? (realizedPnL >= 0 ? "WIN" : "LOSS") : "ACTIVE";
  const riskPctAtEntry =
    modeAtEntry === "HIGH" ? STRATEGY.highModeRiskPct : STRATEGY.lowModeRiskPct;

  return {
    id,
    symbol: "AAPL",
    side: "LONG",
    status,
    entryDate,
    entryDayKey: toETDateKey(entryDate),
    entryPrice: 100,
    entryFills: [],
    exitDate,
    exitDayKey: exitDate ? toETDateKey(exitDate) : null,
    exitPrice: exitDate ? 101 : null,
    exitFills: [],
    quantity: 1,
    remainingQty: status === "CLOSED" ? 0 : 1,
    realizedPnL: status === "CLOSED" ? realizedPnL : 0,
    unrealizedPnL: 0,
    totalPnL: status === "CLOSED" ? realizedPnL : 0,
    pnlPercent: 0,
    commission: 0,
    riskUsed: 0,
    riskPercent: 0,
    stopPrice: null,
    modeAtEntry,
    riskPctAtEntry,
    equityAtEntry: 10000,
    riskDollarsAtEntry: 10000 * riskPctAtEntry,
    outcome,
    marketDate: exitDay ?? entryDay,
    durationMinutes: exitDate ? 60 : null,
  };
}

describe("Restart throttle state machine (daily lock)", () => {
  test("realizedPnL == 0 counts as WIN", () => {
    const trades = [
      makeTrade("L1", "2026-01-02", "2026-01-02", -100),
      makeTrade("Z1", "2026-01-03", "2026-01-03", 0),
    ];

    const { directives } = applyDailyDirectives(trades, 10000, STRATEGY);
    const day4 = directives.find((directive) => directive.date === "2026-01-04");

    expect(day4?.mode).toBe("LOW");
    expect(day4?.lowWinsProgress).toBe(1);
  });

  test("auto daily lock keeps same-day entries on same directive", () => {
    const trades = [
      makeTrade("A1", "2026-01-02", "2026-01-02", -50),
      makeTrade("A2", "2026-01-02", "2026-01-02", 25),
    ];

    const { assignments, directives } = applyDailyDirectives(trades, 10000, STRATEGY);
    const tradeA1 = assignments.get("A1");
    const tradeA2 = assignments.get("A2");
    const day3 = directives.find((directive) => directive.date === "2026-01-03");

    expect(tradeA1?.riskPctAtEntry).toBe(STRATEGY.highModeRiskPct);
    expect(tradeA2?.riskPctAtEntry).toBe(STRATEGY.highModeRiskPct);
    expect(day3?.mode).toBe("LOW");
  });

  test("equity availability ignores same-day exits", () => {
    const trades = [
      makeTrade("B1", "2026-01-02", "2026-01-02", 1000),
      makeTrade("B2", "2026-01-02", "2026-01-02", 200),
      makeTrade("B3", "2026-01-03", "2026-01-03", 100),
    ];

    const { assignments } = applyDailyDirectives(trades, 10000, STRATEGY);

    expect(assignments.get("B1")?.equityAtEntry).toBe(10000);
    expect(assignments.get("B2")?.equityAtEntry).toBe(10000);
    expect(assignments.get("B3")?.equityAtEntry).toBe(11200);
  });

  test("wins only count toward restore when entered in LOW", () => {
    const trades = [
      makeTrade("C1", "2026-01-02", "2026-01-02", -100),
      makeTrade("C2", "2026-01-02", "2026-01-03", 50, "HIGH"),
      makeTrade("C3", "2026-01-03", "2026-01-03", 50, "LOW"),
    ];

    const { directives } = applyDailyDirectives(trades, 10000, STRATEGY);
    const day4 = directives.find((directive) => directive.date === "2026-01-04");

    expect(day4?.mode).toBe("LOW");
    expect(day4?.lowWinsProgress).toBe(1);
  });

  test("two LOW-entered wins restore HIGH next day", () => {
    const trades = [
      makeTrade("R1", "2026-01-02", "2026-01-02", -100),
      makeTrade("R2", "2026-01-03", "2026-01-03", 20, "LOW"),
      makeTrade("R3", "2026-01-03", "2026-01-03", 30, "LOW"),
    ];

    const { directives } = applyDailyDirectives(trades, 10000, STRATEGY);
    const day4 = directives.find((directive) => directive.date === "2026-01-04");

    expect(day4?.mode).toBe("HIGH");
    expect(day4?.lowWinsProgress).toBe(0);
  });

  test("current risk reflects today directive", () => {
    const today = toETDateKey(new Date());
    const trades = [makeTrade("D1", today, today, -20)];
    const current = getCurrentRisk(trades, 10000, STRATEGY);

    expect(current.mode).toBe("HIGH");
    expect(current.riskPct).toBe(STRATEGY.highModeRiskPct);
  });

  test("win rate is a 0-1 fraction and formats to percent", () => {
    const trades = [
      makeTrade("W1", "2026-02-01", "2026-02-01", 100),
      makeTrade("L1", "2026-02-02", "2026-02-02", -50),
    ];

    const metrics = calculateMetrics(trades);

    expect(metrics.winRate).toBe(0.5);
    expect(formatPercent(metrics.winRate)).toBe("50.00%");
  });
});
