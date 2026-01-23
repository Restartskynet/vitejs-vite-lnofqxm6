// src/utils/dates.ts
// Phase 1: no external date libs.
// We expose both "local" and "market" date keys so the engine can group by trading day.

export const MARKET_TZ = "America/New_York";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function dateKeyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  return `${y}-${m}-${dd}`;
}

/**
 * Date key in a specific IANA timezone using Intl.
 * This avoids date-fns-tz entirely.
 */
export function dateKeyMarket(d: Date, tz: string = MARKET_TZ): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const year = get("year");
  const month = get("month");
  const day = get("day");

  return `${year}-${month}-${day}`;
}

export function parseDateKey(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  // Noon UTC prevents “date shift” bugs when doing day math
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function addDays(yyyyMmDd: string, days: number): string {
  const dt = parseDateKey(yyyyMmDd);
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

export function nextBusinessDay(yyyyMmDd: string): string {
  let cur = addDays(yyyyMmDd, 1);

  while (true) {
    const dt = parseDateKey(cur);
    const dow = dt.getUTCDay(); // 0=Sun 6=Sat
    if (dow !== 0 && dow !== 6) return cur;
    cur = addDays(cur, 1);
  }
}
