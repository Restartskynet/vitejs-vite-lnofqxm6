import { describe, expect, test } from "vitest";
import { dashboardReducer, initialDashboardState } from "../stores/dashboardStore";
import type { Fill, PendingOrder } from "../engine/types";

describe("dashboard store pending orders", () => {
  test("stores pending orders and keeps inferred stops in derived trades", () => {
    const entryTime = new Date("2026-01-30T14:33:00.000Z");
    const pendingTime = new Date("2026-01-30T14:33:01.000Z");

    const fill: Fill = {
      id: "fill_test",
      symbol: "ASTS",
      side: "BUY",
      quantity: 3,
      price: 120.62,
      filledTime: entryTime,
      orderId: "order_1",
      commission: 0,
      marketDate: "2026-01-30",
      rowIndex: 0,
      stopPrice: null,
    };

    const pendingOrder: PendingOrder = {
      symbol: "ASTS",
      side: "SELL",
      price: 120.62,
      stopPrice: null,
      limitPrice: null,
      quantity: 3,
      placedTime: pendingTime,
      type: "UNKNOWN",
    };

    const nextState = dashboardReducer(initialDashboardState, {
      type: "IMPORT_FILLS",
      payload: {
        fills: [fill],
        pendingOrders: [pendingOrder],
        metadata: {
          fileName: "orders.csv",
          rowCount: 2,
          fillCount: 1,
          dateRange: { start: "2026-01-30", end: "2026-01-30" },
        },
        mode: "replace",
      },
    } as Parameters<typeof dashboardReducer>[1]);

    expect(nextState.pendingOrders.length).toBe(1);
    expect(nextState.trades.length).toBe(1);
    expect(nextState.trades[0].status).toBe("ACTIVE");
    expect(nextState.trades[0].stopPrice).toBe(120.62);
  });
});
