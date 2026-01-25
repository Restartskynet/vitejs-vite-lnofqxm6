import type { RiskState, StrategyConfig } from "../types/models";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
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
  const theme = mode === "HIGH" ? "destructive" : "secondary";
  const e = explainMode(risk, cfg);

  const nextWinLabel = risk.tomorrowIfWinRiskPct === cfg.highRiskPct ? "HIGH" : "LOW";
  const nextLossLabel = risk.tomorrowIfLossRiskPct === cfg.highRiskPct ? "HIGH" : "LOW";

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Pre-Market Risk Output</span>
          <Badge variant={theme} className="text-sm">
            {mode}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border bg-white p-3">
            <div className="text-xs text-slate-500">Risk % to use</div>
            <div className="text-xl font-semibold">{fmtPct(risk.todayRiskPct)}</div>
          </div>
          <div className="rounded-xl border bg-white p-3">
            <div className="text-xs text-slate-500">Allowed $ risk</div>
            <div className="text-xl font-semibold">{fmtMoney(risk.allowedRiskDollars)}</div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-3">
          <div className="text-xs text-slate-500">As of</div>
          <div className="text-sm font-medium text-slate-900">
            {risk.asOfCloseDate ? `Last closed trade: ${risk.asOfCloseDate}` : "No closed trades yet"}
          </div>
          <div className="text-xs text-slate-500">
            Today: {risk.todayDate} • Next business day: {risk.tomorrowDate}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-3">
          <div className="text-xs text-slate-500">Forecast (based on your next trade)</div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div className="rounded-lg border bg-slate-50 p-2">
              <div className="text-xs text-slate-500">If next trade is WIN</div>
              <div className="text-sm font-semibold">
                {nextWinLabel} ({fmtPct(risk.tomorrowIfWinRiskPct)})
              </div>
            </div>
            <div className="rounded-lg border bg-slate-50 p-2">
              <div className="text-xs text-slate-500">If next trade is LOSS</div>
              <div className="text-sm font-semibold">
                {nextLossLabel} ({fmtPct(risk.tomorrowIfLossRiskPct)})
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-3">
          <div className="text-sm font-semibold text-slate-900">{e.title}</div>
          <div className="text-xs text-slate-500">{e.subtitle}</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-800">
            {e.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
          <div className="mt-2 text-xs text-slate-500">{e.footer}</div>
        </div>
      </CardContent>
    </Card>
  );
}
