// src/importers/webullOrdersImporter.ts
import Papa from "papaparse";
import type { ImportWarning, WebullFill, FillSide } from "../types/models";

type WebullRow = Record<string, string>;

function toNumber(v: string): number {
  const s = (v ?? "")
    .trim()
    .replaceAll(",", "")
    .replaceAll("$", "")
    .replaceAll("@", "");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function parseSide(v: string): FillSide {
  const s = (v ?? "").trim().toUpperCase();
  return s.includes("BUY") ? "BUY" : "SELL";
}

function parseWebullTimestamp(v: string): Date | null {
  // Example: 01/22/2026 09:53:04 EST
  const s = (v ?? "").trim();
  if (!s) return null;

  const parts = s.split(" ");
  if (parts.length < 3) return null;

  const [mdy, hms, tz] = parts;
  const [mm, dd, yyyy] = mdy.split("/").map((x) => Number(x));
  const [HH, MM, SS] = hms.split(":").map((x) => Number(x));

  if (![mm, dd, yyyy, HH, MM, SS].every(Number.isFinite)) return null;

  // Convert EST/EDT to a fixed offset for v1 (Webull exports these)
  const offset =
    tz === "EDT" ? "-04:00" : tz === "EST" ? "-05:00" : "";

  const iso = `${String(yyyy).padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}T${String(HH).padStart(2, "0")}:${String(MM).padStart(2, "0")}:${String(SS).padStart(2, "0")}${offset}`;

  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d : null;
}

export function importWebullOrders(csvText: string): {
  fills: WebullFill[];
  warnings: ImportWarning[];
  rawCount: number;
  filledCount: number;
  usedCount: number;
  skippedCount: number;
} {
  const warnings: ImportWarning[] = [];

  const parsed = Papa.parse<WebullRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors?.length) {
    warnings.push({
      level: "warning",
      code: "csv_parse_errors",
      message: `CSV parse reported ${parsed.errors.length} issue(s).`,
      meta: { errors: parsed.errors.slice(0, 5) },
    });
  }

  const rows = (parsed.data ?? []).filter((r) => r && Object.keys(r).length > 0);
  const rawCount = rows.length;

  const required = ["Symbol", "Side", "Status", "Filled", "Avg Price", "Filled Time"];
  const headers = parsed.meta.fields ?? [];
  const missing = required.filter((c) => !headers.includes(c));

  if (missing.length) {
    warnings.push({
      level: "error",
      code: "missing_required_columns",
      message: `Missing required column(s): ${missing.join(", ")}`,
      meta: { missing },
    });

    return {
      fills: [],
      warnings,
      rawCount,
      filledCount: 0,
      usedCount: 0,
      skippedCount: 0,
    };
  }

  let filledCount = 0;
  let partiallyFilledCount = 0;

  const fills: WebullFill[] = [];
  let skippedFilled = 0;

  for (const r of rows) {
    const status = (r["Status"] ?? "").trim().toLowerCase();

    if (status === "partially filled") {
      partiallyFilledCount += 1;
      continue;
    }

    if (status !== "filled") continue;

    filledCount += 1;

    const symbol = (r["Symbol"] ?? "").trim().toUpperCase();
    const side = parseSide(r["Side"] ?? "");
    const qty = toNumber(r["Filled"] ?? "");
    const price = toNumber(r["Avg Price"] ?? "");
    const ts = parseWebullTimestamp(r["Filled Time"] ?? "");

    if (!symbol || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price <= 0 || !ts) {
      skippedFilled += 1;
      continue;
    }

    const id = `${symbol}|${side}|${qty}|${price}|${ts.toISOString()}`;

    fills.push({
      id,
      symbol,
      side,
      qty,
      price,
      ts,
    });
  }

  if (filledCount === 0) {
    warnings.push({
      level: "warning",
      code: "no_filled_orders",
      message: "No rows with Status = Filled were found.",
    });
  }

  if (partiallyFilledCount > 0) {
    warnings.push({
      level: "warning",
      code: "ignored_partially_filled",
      message: `Ignored ${partiallyFilledCount} row(s) with Status = Partially Filled (v1 policy).`,
      meta: { partiallyFilledCount },
    });
  }

  if (skippedFilled > 0) {
    warnings.push({
      level: "info",
      code: "skipped_filled_rows",
      message: `Skipped ${skippedFilled} Filled row(s) due to invalid/missing fields.`,
      meta: { skippedFilled },
    });
  }

  // Deduplicate + sort by time
  const byId = new Map<string, WebullFill>();
  for (const f of fills) byId.set(f.id, f);

  const deduped = Array.from(byId.values()).sort((a, b) => a.ts.getTime() - b.ts.getTime());

  return {
    fills: deduped,
    warnings,
    rawCount,
    filledCount,
    usedCount: deduped.length,
    skippedCount: Math.max(0, filledCount - deduped.length),
  };
}
