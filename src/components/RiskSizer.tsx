import { useMemo, useState } from "react";
import type { RiskState } from "../types/models";
import { fmtMoney } from "../utils/numbers";

function safeNum(s: string): number | null {
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

type Calc =
  | { ok: true; perShare: number; maxShares: number; riskUsed: number; positionValue: number }
  | { ok: false; error: string; suggestion: string }
  | null;

export function RiskSizer({ risk }: { risk: RiskState }) {
  const [entry, setEntry] = useState("10");
  const [stop, setStop] = useState("9.8");

  const calc: Calc = useMemo(() => {
    const e = safeNum(entry);
    const st = safeNum(stop);
    if (e === null || st === null) return null;

    const perShare = Math.abs(e - st);
    if (perShare <= 0) {
      return { ok: false, error: "Invalid stop", suggestion: "Stop must differ from entry." };
    }

    // Protection: stop too tight
    if (perShare < 0.05) {
      return {
        ok: false,
        error: "Stop too tight (< $0.05)",
        suggestion: "Widen your stop or reduce position size.",
      };
    }

    const maxShares = Math.floor(risk.allowedRiskDollars / perShare);
    if (maxShares <= 0) {
      return {
        ok: false,
        error: "Risk too small for this stop",
        suggestion: "Increase risk $ or widen stop distance.",
      };
    }

    const riskUsed = maxShares * perShare;
    const positionValue = maxShares * e;

    // Sanity: >4x account equity (margin danger)
    if (positionValue > risk.equityAsOfClose * 4) {
      return {
        ok: false,
        error: "Position > 400% of account",
        suggestion: "Double-check stop price (fat finger?) or use smaller size.",
      };
    }

    return { ok: true, perShare, maxShares, riskUsed, positionValue };
  }, [entry, stop, risk.allowedRiskDollars, risk.equityAsOfClose]);

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-white mb-4">Position Sizer (Entry / Stop → Max Shares)</h3>
      
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <div className="mb-1 text-xs text-slate-400">Entry</div>
          <input 
            value={entry} 
            onChange={(e) => setEntry(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-700 bg-slate-900/50 px-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-600/50"
          />
        </div>

        <div>
          <div className="mb-1 text-xs text-slate-400">Stop</div>
          <input 
            value={stop} 
            onChange={(e) => setStop(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-700 bg-slate-900/50 px-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-600/50"
          />
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
          {calc ? (
            calc.ok ? (
              <div className="space-y-1">
                <div className="text-xs text-slate-400">Risk / share</div>
                <div className="text-lg font-bold text-white">
                  {fmtMoney(calc.perShare)}
                </div>

                <div className="text-xs text-slate-400">Max shares</div>
                <div className="text-2xl font-black text-white">
                  {calc.maxShares.toLocaleString()}
                </div>

                <div className="text-xs text-slate-400">Risk used</div>
                <div className="text-sm font-semibold text-white">
                  {fmtMoney(calc.riskUsed)}
                </div>

                <div className="text-xs text-slate-400">Position value</div>
                <div className="text-sm font-semibold text-white">
                  {fmtMoney(calc.positionValue)}
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-xs font-semibold text-red-400">
                  ⚠️ {calc.error}
                </div>
                <div className="text-xs text-slate-400">
                  {calc.suggestion}
                </div>
              </div>
            )
          ) : (
            <div className="text-sm text-slate-500">Enter valid Entry + Stop</div>
          )}
        </div>
      </div>
    </div>
  );
}