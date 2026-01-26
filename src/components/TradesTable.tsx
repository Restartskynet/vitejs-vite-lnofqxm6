import { useMemo, useState } from "react";
import type { Trade } from "../types/models";
import { fmtMoney } from "../utils/numbers";

export function TradesTable({ trades }: { trades: Trade[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return trades;
    return trades.filter((t) => t.symbol.toLowerCase().includes(s));
  }, [trades, q]);

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm overflow-hidden">
      <div className="p-6 pb-4 border-b border-slate-700/50 flex flex-row items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">Trades (Position Sessions)</h3>
        <button 
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center justify-center rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-slate-600"
        >
          {open ? "Hide" : "Show"}
        </button>
      </div>

      {open ? (
        <div className="p-6">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="w-full sm:w-64">
              <input
                placeholder="Filter ticker (e.g. TSLA)"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-700 bg-slate-900/50 px-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-600/50"
              />
            </div>
            <div className="text-xs text-slate-500">
              Showing {filtered.length.toLocaleString()} trades
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/50 text-xs text-slate-400">
                <tr>
                  {["Symbol", "Qty", "Entry", "Exit", "Entry Px", "Exit Px", "PnL", "Legs"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filtered.slice(0, 300).map((t) => (
                  <tr key={t.id} className="border-t border-slate-700">
                    <td className="whitespace-nowrap px-3 py-2 font-semibold text-white">{t.symbol}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-300">{t.qty}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-300">{t.entryDate}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-300">{t.exitDate}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-300">{t.entryPrice.toFixed(4)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-300">{t.exitPrice.toFixed(4)}</td>
                    <td className={`whitespace-nowrap px-3 py-2 font-semibold ${t.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {fmtMoney(t.pnl)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-300">{t.legs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length > 300 ? (
            <div className="mt-2 text-xs text-slate-500">Showing first 300 rows</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}