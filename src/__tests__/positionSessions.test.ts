import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { importWebullOrders } from "../importers/webullOrdersImporter";
import { buildPositionSessions } from "../engine/positionSessions";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) =>
  readFileSync(resolve(__dirname, "../../testdata", name), "utf8");

describe("Trade building determinism", () => {
  test("same fills -> identical trades (including IDs)", () => {
    const csv = fixture("valid_small.csv");
    const imported = importWebullOrders(csv);

    const a = buildPositionSessions(imported.fills);
    const b = buildPositionSessions(imported.fills);

    expect(a.warnings).toEqual(b.warnings);
    expect(a.trades).toEqual(b.trades);

    expect(a.trades.length).toBe(1);
    expect(a.trades[0].pnl).toBe(10);
    expect(a.trades[0].win).toBe(true);
    expect(a.trades[0].loss).toBe(false);
  });
});
