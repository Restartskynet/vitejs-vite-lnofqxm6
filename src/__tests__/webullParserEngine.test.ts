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

  test("calculates short P&L correctly", () => {
    const csv = buildCsv([
      "TSLA,SELL,Filled,5,20.00,01/22/2026 09:31:00 EST,0",
      "TSLA,BUY,Filled,5,18.00,01/22/2026 09:32:00 EST,0",
    ]);

    const parsed = parseWebullCSV(csv);
    const { trades } = buildTrades(parsed.fills);

    expect(trades.length).toBe(1);
    expect(trades[0].side).toBe("SHORT");
    expect(trades[0].realizedPnL).toBe(10);
  });
});
