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

describe("Restart throttle state machine (per-trade)", () => {
  test("no trades -> starts HIGH", () => {
    const r = computeRiskState([], 20000, STRATEGY);
    expect(r.mode).toBe("HIGH");
    expect(r.lowWinsProgress).toBe(0);
    expect(r.todayRiskPct).toBe(STRATEGY.highRiskPct);
  });

  test("loss in HIGH -> LOW (immediate next trade)", () => {
    const trades = [makeTrade(-1, new Date("2026-01-02T18:00:00Z"))];
    const r = computeRiskState(trades, 20000, STRATEGY);

    expect(r.mode).toBe("LOW");
    expect(r.lowWinsProgress).toBe(0);
    expect(r.todayRiskPct).toBe(STRATEGY.lowRiskPct);
  });

  test("LOW: 2 wins -> HIGH; breakeven ignored", () => {
    const trades = [
      makeTrade(-1, new Date("2026-01-02T18:00:00Z")), // HIGH -> LOW
      makeTrade(+1, new Date("2026-01-02T18:10:00Z")), // LOW progress 1
      makeTrade(0, new Date("2026-01-02T18:20:00Z")),  // ignored
      makeTrade(+1, new Date("2026-01-02T18:30:00Z")), // progress 2 -> HIGH
    ];

    const r = computeRiskState(trades, 20000, STRATEGY);
    expect(r.mode).toBe("HIGH");
    expect(r.lowWinsProgress).toBe(0);
    expect(r.todayRiskPct).toBe(STRATEGY.highRiskPct);
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
    expect(r.todayRiskPct).toBe(STRATEGY.lowRiskPct);
  });

  test("forecast: LOW with 1 win -> next WIN returns HIGH", () => {
    const trades = [
      makeTrade(-1, new Date("2026-01-02T18:00:00Z")), // HIGH -> LOW
      makeTrade(+1, new Date("2026-01-02T18:10:00Z")), // LOW progress 1
    ];

    const r = computeRiskState(trades, 20000, STRATEGY);
    expect(r.mode).toBe("LOW");
    expect(r.lowWinsProgress).toBe(1);
    expect(r.tomorrowIfWinRiskPct).toBe(STRATEGY.highRiskPct);
    expect(r.tomorrowIfLossRiskPct).toBe(STRATEGY.lowRiskPct);
  });
});
