import type { Metrics } from "../types/models";
import { fmtMoney } from "../utils/numbers";

export function KpiCards({ metrics }: { metrics: Metrics | null }) {
  if (!metrics) return null;
  const m = metrics;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <div className="group relative overflow-hidden rounded-xl border border-slate-700 bg-slate-800/50 p-4 backdrop-blur-sm transition-all duration-300 hover:border-slate-600 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10">
          <div className="text-xs text-slate-400 font-medium">Trades</div>
          <div className="text-2xl font-bold text-white mt-1">{m.totalTrades}</div>
        </div>
      </div>

      <div className="group relative overflow-hidden rounded-xl border border-slate-700 bg-slate-800/50 p-4 backdrop-blur-sm transition-all duration-300 hover:border-slate-600 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10">
          <div className="text-xs text-slate-400 font-medium">Win rate</div>
          <div className="text-2xl font-bold text-white mt-1">{m.winRatePct.toFixed(1)}%</div>
          <div className="text-xs text-slate-500 mt-1">
            {m.wins}W / {m.losses}L
          </div>
        </div>
      </div>

      <div className="group relative overflow-hidden rounded-xl border border-slate-700 bg-slate-800/50 p-4 backdrop-blur-sm transition-all duration-300 hover:border-slate-600 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10">
          <div className="text-xs text-slate-400 font-medium">Total P&L</div>
          <div className={`text-2xl font-bold mt-1 ${m.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {fmtMoney(m.totalPnL)}
          </div>
        </div>
      </div>

      <div className="group relative overflow-hidden rounded-xl border border-slate-700 bg-slate-800/50 p-4 backdrop-blur-sm transition-all duration-300 hover:border-slate-600 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10">
          <div className="text-xs text-slate-400 font-medium">Max drawdown</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {(m.maxDrawdownPct * 100).toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  );
}