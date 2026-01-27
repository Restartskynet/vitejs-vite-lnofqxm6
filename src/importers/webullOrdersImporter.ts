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
// Webull exports timestamps like: "01/22/2026 09:53:04 EST"
// We convert to a real Date by translating TZ suffix to a numeric offset.
function parseWebullTimestamp(text: string): Date | null {
  const raw = (text ?? "").trim();
  if (!raw) return null;

  // Match: MM/DD/YYYY HH:MM:SS [TZ]
  const m = raw.match(
    /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})(?:\s+([A-Z]{2,4}))?$/
  );
  if (!m) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const mm = Number(m[1]);
  const dd = Number(m[2]);
  const yyyy = Number(m[3]);
  const hh = Number(m[4]);
  const mi = Number(m[5]);
  const ss = Number(m[6]);
  const tz = (m[7] ?? "").toUpperCase();

  // Webull commonly uses EST/EDT. If no TZ is present, interpret as local.
  let offsetHours: number | null = null;
  if (tz === "EST") offsetHours = 5;
  if (tz === "EDT") offsetHours = 4;

  if (offsetHours == null) {
    const d = new Date(yyyy, mm - 1, dd, hh, mi, ss);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Convert NY time -> UTC by adding offsetHours
  const utc = Date.UTC(yyyy, mm - 1, dd, hh + offsetHours, mi, ss);
  const d = new Date(utc);
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface ImportResult {
  fills: WebullFill[];
  warnings: ImportWarning[];

  rawCount: number;
  filledCount: number;
  usedCount: number;
  skippedCount: number;
}

const REQUIRED_COLS = ["Symbol", "Side", "Status", "Filled", "Avg Price", "Filled Time"];

export function importWebullOrders(csvText: string): ImportResult {
  const warnings: ImportWarning[] = [];

  const parsed = Papa.parse<WebullRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => (h ?? "").trim(),
  });

  if (parsed.errors?.length) {
    warnings.push({
      level: "warning",
      code: "csv_parse_errors",
      message: `CSV parse reported ${parsed.errors.length} error(s). First: ${parsed.errors[0].message}`,
    });
  }

  const rows = (parsed.data ?? []).filter((r) => Object.keys(r).length > 0);
  const rawCount = rows.length;

  const sample = rows[0] ?? {};
  const missingCols = REQUIRED_COLS.filter((c) => !(c in sample));
  if (missingCols.length) {
    return {
      fills: [],
      warnings: [
        ...warnings,
        {
          level: "error",
          code: "missing_required_columns",
          message: `Missing required column(s): ${missingCols.join(", ")}`,
          action: "Re-export Webull Orders Records CSV",
        },
      ],
      rawCount,
      filledCount: 0,
      usedCount: 0,
      skippedCount: 0,
    };
  }

  let partiallyFilledCount = 0;
  const filledRows: WebullRow[] = [];

  for (const r of rows) {
    const status = (r["Status"] ?? "").trim().toLowerCase();
    if (status === "filled") filledRows.push(r);
    else if (status === "partially filled") partiallyFilledCount += 1;
  }

  const filledCount = filledRows.length;

  if (filledCount === 0) {
    warnings.push({
      level: "warning",
      code: "no_filled_orders",
      message: "No rows with Status=Filled were found. Nothing to import.",
      action: "Export after your orders have filled, or verify you're using Webull Orders Records.",
    });
  }

  if (partiallyFilledCount > 0) {
    warnings.push({
      level: "info",
      code: "ignored_partially_filled",
      message: `Ignored ${partiallyFilledCount} row(s) with Status=Partially Filled (v1 policy).`,
      action: "Re-export after fills complete (or add partial-fill support in v2).",
      meta: { partiallyFilledCount },
    });
  }

  const fills: WebullFill[] = [];
  let skippedFilledCount = 0;

  for (const r of filledRows) {
    const symbol = (r["Symbol"] ?? "").trim().toUpperCase();
    const sideRaw = (r["Side"] ?? "").trim().toUpperCase();
    const side: FillSide = sideRaw.includes("BUY") ? "BUY" : "SELL";

    const qty = toNumber(r["Filled"] ?? "");
    const price = toNumber(r["Avg Price"] ?? "");
    const ts = parseWebullTimestamp(r["Filled Time"] ?? "");

    if (!symbol || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price <= 0 || !ts) {
      skippedFilledCount += 1;
      continue;
    }

    const iso = ts.toISOString();
    const id = `${symbol}|${side}|${qty}|${price}|${iso}`;

    fills.push({
      id,
      symbol,
      side,
      qty,
      price,
      ts,
    });
  }

  const usedCount = fills.length;
  const skippedCount = filledCount - usedCount;

  if (skippedCount > 0) {
    warnings.push({
      level: "info",
      code: "skipped_filled_rows",
      message: `Skipped ${skippedCount}/${filledCount} filled row(s) due to missing or invalid fields.`,
      action: "Check the CSV for blank Filled/Avg Price/Filled Time values",
      meta: { skippedCount, filledCount },
    });
  }

  // sort by time
  fills.sort((a, b) => a.ts.getTime() - b.ts.getTime());

  return {
    fills,
    warnings,
    rawCount,
    filledCount,
    usedCount,
    skippedCount,
  };
}

// Back-compat alias (if anything imports the old name)
export const importWebullOrdersCsv = importWebullOrders;
