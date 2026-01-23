export function toNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;

  const s = String(v).trim();
  if (!s) return null;

  const cleaned = s.replace(/[$,%\s]/g, "").replace("@", "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function fmtPct(x: number): string {
  return `${(x * 100).toFixed(2)}%`;
}

export function fmtMoney(x: number): string {
  return x.toLocaleString(undefined, { style: "currency", currency: "USD" });
}
