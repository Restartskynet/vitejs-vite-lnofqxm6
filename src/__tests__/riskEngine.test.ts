import { describe, expect, test } from "vitest";

import type { Trade } from "../types/models";
import { computeRiskState, STRATEGY } from "../engine/riskEngine";

function makeTrade(pnl: number, exitTs: Date): Trade {
  const entryTs = new Date(exitTs.getTime() - 60_000);
  const entryPrice = 100;
  const qty = 1;
  const exitPrice = entryPrice + pnl;

  return {
    id: `T|${exitTs.toISOString()}|${pnl}`,
    symbol: "AAPL",
    qty,
    entryPrice,
    exitPrice,
    entryTs,
    exitTs,
    entryDate: "2026-01-02",
    exitDate: "2026-01-02",
    pnl,
    win: pnl > 0,
    loss: pnl < 0,
    legs: 2,
  };
}

describe("Restart throttle (riskEngine)", () => {
  test("defaults to HIGH when there are no trades", () => {
    const risk = computeRiskState([], 10_000, STRATEGY);
    expect(risk.mode).toBe("HIGH");
    expect(risk.lowWinsProgress).toBe(0);
    expect(risk.todayRiskPct).toBeCloseTo(0.03, 12);
  });

  test("loss in HIGH drops to LOW (immediately for next trade)", () => {
    const trades = [makeTrade(-1, new Date("2026-01-02T18:00:00.000Z"))];
    const risk = computeRiskState(trades, 10_000, STRATEGY);
    expect(risk.mode).toBe("LOW");
    expect(risk.lowWinsProgress).toBe(0);
    expect(risk.todayRiskPct).toBeCloseTo(0.001, 12);
  });

  test("in LOW: 2 wins returns to HIGH; breakeven ignored; loss resets progress", () => {
    const t1 = makeTrade(-1, new Date("2026-01-02T18:00:00.000Z")); // HIGH -> LOW
    const t2 = makeTrade(+1, new Date("2026-01-02T19:00:00.000Z")); // LOW progress 1
    const t3 = makeTrade(0, new Date("2026-01-02T20:00:00.000Z")); // ignored
    const t4 = makeTrade(-1, new Date("2026-01-02T21:00:00.000Z")); // reset progress
    const t5 = makeTrade(+1, new Date("2026-01-02T22:00:00.000Z")); // progress 1
    const t6 = makeTrade(+1, new Date("2026-01-02T23:00:00.000Z")); // progress 2 -> HIGH

    const risk = computeRiskState([t1, t2, t3, t4, t5, t6], 10_000, STRATEGY);
    expect(risk.mode).toBe("HIGH");
    expect(risk.lowWinsProgress).toBe(0);
    expect(risk.todayRiskPct).toBeCloseTo(0.03, 12);
  });

  test("forecast reflects next-trade transitions", () => {
    const t1 = makeTrade(-1, new Date("2026-01-02T18:00:00.000Z")); // HIGH -> LOW
    const t2 = makeTrade(+1, new Date("2026-01-02T19:00:00.000Z")); // LOW progress 1

    const risk = computeRiskState([t1, t2], 10_000, STRATEGY);
    expect(risk.mode).toBe("LOW");
    expect(risk.lowWinsProgress).toBe(1);

    // If the next trade is a win, we should be back to HIGH (2 wins in LOW)
    expect(risk.tomorrowIfWinRiskPct).toBeCloseTo(0.03, 12);
    // If the next trade is a loss, we stay LOW
    expect(risk.tomorrowIfLossRiskPct).toBeCloseTo(0.001, 12);
  });
});
