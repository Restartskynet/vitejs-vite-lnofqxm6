import type { RiskState, StrategyConfig } from "../types/models";
import { fmtMoney, fmtPct } from "../utils/numbers";
import { explainMode } from "../engine/explain";

export function HeroRiskPanel({
  risk,
  cfg,
}: {
  risk: RiskState;
  cfg: StrategyConfig;
}) {
  const mode = risk.mode;
  const e = explainMode(risk, cfg);

  const nextWinLabel = risk.tomorrowIfWinRiskPct === cfg.highRiskPct ? "HIGH" : "LOW";
  const nextLossLabel = risk.tomorrowIfLossRiskPct === cfg.highRiskPct ? "HIGH" : "LOW";

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm overflow-hidden">
      {/* Header with Glow Badge */}
      <div className="p-6 pb-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-white">Pre-Market Risk Output</span>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-sm ${
            mode === "HIGH" 
              ? "bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 text-emerald-400 border-emerald-500/30" 
              : "bg-gradient-to-r from-amber-500/20 to-orange-600/20 text-amber-400 border-amber-500/30"
          } font-semibold text-sm uppercase tracking-wider shadow-lg`}>
            <div className={`w-2 h-2 rounded-full ${mode === "HIGH" ? "bg-emerald-400" : "bg-amber-400"} animate-pulse`} />
            {mode}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Risk Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
            <div className="text-xs text-slate-400">Risk % to use</div>
            <div className="text-2xl font-bold text-white mt-1">{fmtPct(risk.todayRiskPct)}</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
            <div className="text-xs text-slate-400">Allowed $ risk</div>
            <div className="text-2xl font-bold text-white mt-1">{fmtMoney(risk.allowedRiskDollars)}</div>
          </div>
        </div>

        {/* Date Info */}
        <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
          <div className="text-xs text-slate-400">As of</div>
          <div className="text-sm font-medium text-white mt-1">
            {risk.asOfCloseDate ? `Last closed trade: ${risk.asOfCloseDate}` : "No closed trades yet"}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Today: {risk.todayDate} • Next business day: {risk.tomorrowDate}
          </div>
        </div>

        {/* Forecast Grid */}
        <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
          <div className="text-xs text-slate-400 mb-3">Forecast (based on your next trade)</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
              <div className="text-xs text-emerald-400">If next trade is WIN</div>
              <div className="text-sm font-bold text-emerald-400 mt-1">
                {nextWinLabel} ({fmtPct(risk.tomorrowIfWinRiskPct)})
              </div>
            </div>
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3">
              <div className="text-xs text-rose-400">If next trade is LOSS</div>
              <div className="text-sm font-bold text-rose-400 mt-1">
                {nextLossLabel} ({fmtPct(risk.tomorrowIfLossRiskPct)})
              </div>
            </div>
          </div>
        </div>

        {/* Explanation */}
        <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
          <div className="text-sm font-semibold text-white">{e.title}</div>
          <div className="text-xs text-slate-400 mt-1">{e.subtitle}</div>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            {e.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 text-xs text-slate-500">{e.footer}</div>
        </div>
      </div>
    </div>
  );
}
