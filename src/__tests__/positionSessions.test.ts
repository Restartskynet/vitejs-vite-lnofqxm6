import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { importWebullOrders } from "../importers/webullOrdersImporter";
import { buildPositionSessions } from "../engine/positionSessions";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) =>
  readFileSync(resolve(__dirname, "../../testdata", name), "utf8");

describe("position session builder", () => {
  test("is deterministic for identical fill inputs", () => {
    const csv = fixture("valid_small.csv");
    const imp = importWebullOrders(csv);

    const run1 = buildPositionSessions(imp.fills);
    const run2 = buildPositionSessions(imp.fills);

    expect(run1.warnings).toEqual(run2.warnings);
    expect(run1.trades).toEqual(run2.trades);

    // sanity: expected 1 closed trade
    expect(run1.trades.length).toBe(1);
    expect(run1.trades[0].symbol).toBe("AAPL");
    expect(run1.trades[0].pnl).toBeCloseTo(10, 6);
  });
});
