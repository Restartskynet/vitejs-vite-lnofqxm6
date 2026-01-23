// src/importers/webullOrdersImporter.ts
import Papa from "papaparse";
import type { WebullFill, FillSide } from "../types/models";
import { toNumber } from "../utils/numbers";

function normalizeSide(v: unknown): FillSide | null {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return null;
  if (s.includes("buy")) return "BUY";
  if (s.includes("sell")) return "SELL";
  return null;
}

/**
 * Webull example: "01/22/2026 09:53:04 EST"
 * We convert EST/EDT -> a real UTC Date, without date-fns-tz.
 */
function parseWebullTimestamp(s: unknown): Date | null {
  if (s === null || s === undefined) return null;
  const raw = String(s).trim();
  if (!raw) return null;

  // Capture optional timezone suffix
  const tzMatch = raw.match(/\s+(EST|EDT)\s*$/i);
  const tz = tzMatch ? tzMatch[1].toUpperCase() : null;

  const cleaned = raw.replace(/\s+(EST|EDT)\s*$/i, "").trim();

  const m = cleaned.match(
    /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/
  );
  if (!m) return null;

  const mm = Number(m[1]);
  const dd = Number(m[2]);
  const yyyy = Number(m[3]);
  const hh = Number(m[4]);
  const min = Number(m[5]);
  const sec = Number(m[6]);

  // Interpret input time as US Eastern (EST/EDT) if suffix present.
  // EST = UTC-5, EDT = UTC-4
  if (tz === "EST") {
    return new Date(Date.UTC(yyyy, mm - 1, dd, hh + 5, min, sec));
  }
  if (tz === "EDT") {
    return new Date(Date.UTC(yyyy, mm - 1, dd, hh + 4, min, sec));
  }

  // If no suffix, fall back to local interpretation
  return new Date(yyyy, mm - 1, dd, hh, min, sec);
}

function makeStableFillId(
  symbol: string,
  side: FillSide,
  qty: number,
  price: number,
  ts: Date
): string {
  return `${symbol}|${side}|${qty}|${price}|${ts.toISOString()}`;
}

export interface ImportStats {
  totalRows: number;
  filledRows: number;
  usedRows: number;
}

export interface ImportResult {
  fills: WebullFill[];
  stats: ImportStats;
  warnings: string[];
}

export function importWebullOrdersCsv(csvText: string): ImportResult {
  const warnings: string[] = [];

  const parsed = Papa.parse<Record<string, unknown>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors?.length) {
    warnings.push(`CSV parse warnings: ${parsed.errors.length}`);
  }

  const rows = parsed.data ?? [];
  const totalRows = rows.length;

  const requiredCols = [
    "Symbol",
    "Side",
    "Status",
    "Filled",
    "Avg Price",
    "Price",
    "Filled Time",
    "Placed Time",
  ];

  const sampleRow = rows[0] ?? {};
  for (const col of requiredCols) {
    if (!(col in sampleRow)) warnings.push(`Missing column: ${col}`);
  }

  let filledRows = 0;
  const fills: WebullFill[] = [];

  for (const r of rows) {
    const status = String(r["Status"] ?? "").trim().toLowerCase();
    if (status !== "filled") continue;
    filledRows += 1;

    const symbol = String(r["Symbol"] ?? "").trim();
    if (!symbol) continue;

    const side = normalizeSide(r["Side"]);
    if (!side) continue;

    const qty = toNumber(r["Filled"]);
    if (!qty || qty <= 0) continue;

    const avgPx = toNumber(r["Avg Price"]);
    const pricePx = toNumber(r["Price"]);
    const px = avgPx ?? pricePx;
    if (!px || px <= 0) continue;

    const filledTime = parseWebullTimestamp(r["Filled Time"]);
    const placedTime = parseWebullTimestamp(r["Placed Time"]);
    const ts = filledTime ?? placedTime;
    if (!ts) continue;

    const id = makeStableFillId(symbol, side, qty, px, ts);

    fills.push({
      id,
      symbol,
      side,
      qty,
      price: px,
      ts,
    });
  }

  fills.sort((a, b) => {
    const t = a.ts.getTime() - b.ts.getTime();
    if (t !== 0) return t;
    if (a.side === b.side) return 0;
    return a.side === "BUY" ? -1 : 1;
  });

  return {
    fills,
    stats: { totalRows, filledRows, usedRows: fills.length },
    warnings,
  };
}
