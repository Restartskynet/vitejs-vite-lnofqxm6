// src/components/KpiCards.tsx
import type { Metrics } from "../types/models";
import { fmtMoney } from "../utils/numbers";

export function KpiCards({ metrics }: { metrics: Metrics | null }) {
  if (!metrics) return null;
  const m = metrics;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <div className="rounded-xl border bg-white p-3">
        <div className="text-xs text-slate-500">Trades</div>
        <div className="text-lg font-semibold">{m.totalTrades}</div>
      </div>

      <div className="rounded-xl border bg-white p-3">
        <div className="text-xs text-slate-500">Win rate</div>
        <div className="text-lg font-semibold">{m.winRatePct.toFixed(1)}%</div>
        <div className="text-xs text-slate-500">
          {m.wins}W / {m.losses}L
        </div>
      </div>

      <div className="rounded-xl border bg-white p-3">
        <div className="text-xs text-slate-500">Total P&amp;L</div>
        <div className="text-lg font-semibold">{fmtMoney(m.totalPnL)}</div>
      </div>

      <div className="rounded-xl border bg-white p-3">
        <div className="text-xs text-slate-500">Max drawdown</div>
        <div className="text-lg font-semibold">{(m.maxDrawdownPct * 100).toFixed(2)}%</div>
      </div>
    </div>
  );
}
