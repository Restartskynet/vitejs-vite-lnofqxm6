import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { importWebullOrders } from "../importers/webullOrdersImporter";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) =>
  readFileSync(resolve(__dirname, "../../testdata", name), "utf8");

describe("Webull Orders importer", () => {
  test("fails when required columns are missing", () => {
    const csv = fixture("missing_required_columns.csv");
    const res = importWebullOrders(csv);

    expect(res.fills.length).toBe(0);
    expect(res.warnings.some((w) => w.code === "missing_required_columns" && w.level === "error")).toBe(
      true
    );
  });

  test("ignores partially filled rows and emits a warning", () => {
    const csv = fixture("partially_filled_ignored.csv");
    const res = importWebullOrders(csv);

    expect(res.filledCount).toBe(2);
    expect(res.usedCount).toBe(2);
    expect(res.warnings.some((w) => w.code === "ignored_partially_filled")).toBe(true);
  });

  test("parses @/$/comma formats", () => {
    const csv = fixture("weird_price_format.csv");
    const res = importWebullOrders(csv);

    expect(res.usedCount).toBe(1);
    expect(res.fills[0].qty).toBe(1000);
    expect(res.fills[0].price).toBeCloseTo(1234.56, 6);
  });
});
