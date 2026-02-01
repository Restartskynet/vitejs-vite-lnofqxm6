import { describe, expect, test } from "vitest";
import { parseWebullCSV } from "../engine/webullParser";
import { buildTrades } from "../engine/tradesBuilder";

const buildCsv = (rows: string[]) => [
  "Symbol,Side,Status,Filled,Avg Price,Filled Time,Commission",
  ...rows,
].join("\n");

describe("Webull parser + trade builder", () => {
  test("handles empty import safely", () => {
    const parsed = parseWebullCSV('');

    expect(parsed.success).toBe(false);
    expect(parsed.fills.length).toBe(0);
    expect(parsed.errors.length).toBeGreaterThan(0);
  });

  test("parses numeric formats and reports skipped rows", () => {
    const csv = buildCsv([
      "AAPL,BUY,Filled,\"2,500\",\"$1,234.56\",01/22/2026 09:31:00 EST,($1.25)",
      "AAPL,SELL,Filled,--,12.00,01/22/2026 09:32:00 EST,0",
    ]);

    const result = parseWebullCSV(csv);

    expect(result.fills.length).toBe(1);
    expect(result.fills[0].quantity).toBe(2500);
    expect(result.fills[0].price).toBe(1234.56);
    expect(result.skippedRows.length).toBe(1);
    expect(result.skippedRows[0].reasons.join(" ")).toContain("Invalid quantity");
  });

  test("uses CSV row order when timestamps tie", () => {
    const csv = buildCsv([
      "MSFT,BUY,Filled,10,10.00,01/22/2026 09:31:00 EST,0",
      "MSFT,SELL,Filled,10,11.00,01/22/2026 09:31:00 EST,0",
    ]);

    const parsed = parseWebullCSV(csv);
    const { trades } = buildTrades(parsed.fills);

    expect(trades.length).toBe(1);
    expect(trades[0].status).toBe("CLOSED");
    expect(trades[0].side).toBe("LONG");
    expect(trades[0].entryPrice).toBe(10);
    expect(trades[0].exitPrice).toBe(11);
    expect(trades[0].realizedPnL).toBe(10);
  });

  test("marketDate is derived from the CSV date portion", () => {
    const csv = buildCsv([
      "NFLX,BUY,Filled,1,500.00,01/22/2026 23:59:00 EST,0",
      "NFLX,SELL,Filled,1,510.00,01/22/2026 23:59:30 EST,0",
    ]);

    const parsed = parseWebullCSV(csv);

    expect(parsed.fills[0].marketDate).toBe("2026-01-22");
    expect(parsed.fills[1].marketDate).toBe("2026-01-22");
  });

  test("infers stop from pending Orders Records rows", () => {
    const csv = [
      "Name,Symbol,Side,Status,Filled,Total Qty,Price,Avg Price,Time-in-Force,Placed Time,Filled Time",
      "Ast Spacemobile Inc,ASTS,Buy,Filled,3,3,120.62,120.62,GTC,01/30/2026 09:33:00 EST,01/30/2026 09:33:00 EST",
      "Ast Spacemobile Inc,ASTS,Sell,Pending,0,3,119.62,,GTC,01/30/2026 09:33:01 EST,",
    ].join("\n");

    const parsed = parseWebullCSV(csv);
    const { trades } = buildTrades(parsed.fills, 25000, parsed.pendingOrders);

    expect(parsed.pendingOrders.length).toBe(1);
    expect(trades.length).toBe(1);
    expect(trades[0].status).toBe("ACTIVE");
    expect(trades[0].stopPrice).toBe(119.62);
    expect(trades[0].inferredStop).toBe(119.62);
  });

  test("pairs brackets within 2 seconds", () => {
    const csv = [
      "Name,Symbol,Side,Status,Filled,Total Qty,Price,Avg Price,Time-in-Force,Placed Time,Filled Time",
      "Test Corp,TEST,Buy,Filled,10,10,10.00,10.00,GTC,01/30/2026 09:31:00 EST,01/30/2026 09:31:00 EST",
      "Test Corp,TEST,Sell,Pending,0,10,9.50,,GTC,01/30/2026 09:31:02 EST,",
    ].join("\n");

    const parsed = parseWebullCSV(csv);
    const { trades } = buildTrades(parsed.fills, 25000, parsed.pendingOrders);

    expect(trades.length).toBe(1);
    expect(trades[0].status).toBe("ACTIVE");
    expect(trades[0].stopPrice).toBe(9.5);
  });

  test("stop adjustments stay within the same trade unit", () => {
    const csv = [
      "Name,Symbol,Side,Status,Filled,Total Qty,Price,Avg Price,Time-in-Force,Placed Time,Filled Time",
      "Test Corp,TEST,Buy,Filled,10,10,10.00,10.00,GTC,01/30/2026 09:31:00 EST,01/30/2026 09:31:00 EST",
      "Test Corp,TEST,Sell,Pending,0,10,9.50,,GTC,01/30/2026 09:31:01 EST,",
      "Test Corp,TEST,Sell,Cancelled,0,10,9.75,,GTC,01/30/2026 10:00:00 EST,",
      "Test Corp,TEST,Sell,Pending,0,10,9.90,,GTC,01/30/2026 10:00:01 EST,",
    ].join("\n");

    const parsed = parseWebullCSV(csv);
    const { trades } = buildTrades(parsed.fills, 25000, parsed.pendingOrders);

    expect(trades.length).toBe(1);
    expect(trades[0].status).toBe("ACTIVE");
    expect(trades[0].stopPrice).toBe(9.9);
  });

  test("trims do not close the trade until net shares hit zero", () => {
    const csv = [
      "Name,Symbol,Side,Status,Filled,Total Qty,Price,Avg Price,Time-in-Force,Placed Time,Filled Time",
      "Trim Corp,TRIM,Buy,Filled,10,10,10.00,10.00,GTC,01/30/2026 09:31:00 EST,01/30/2026 09:31:00 EST",
      "Trim Corp,TRIM,Sell,Pending,0,10,9.50,,GTC,01/30/2026 09:31:01 EST,",
      "Trim Corp,TRIM,Sell,Filled,4,4,11.00,11.00,GTC,01/30/2026 09:45:00 EST,01/30/2026 09:45:00 EST",
      "Trim Corp,TRIM,Sell,Filled,6,6,12.00,12.00,GTC,01/30/2026 10:00:00 EST,01/30/2026 10:00:00 EST",
    ].join("\n");

    const parsed = parseWebullCSV(csv);
    const { trades } = buildTrades(parsed.fills, 25000, parsed.pendingOrders);

    expect(trades.length).toBe(1);
    expect(trades[0].status).toBe("CLOSED");
    expect(trades[0].realizedPnL).toBe(16);
  });
});
