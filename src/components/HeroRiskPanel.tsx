import type { RiskState, StrategyConfig } from "../types/models";
import { fmtMoney, fmtPct } from "../utils/numbers";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { explainMode } from "../engine/explain";

export function HeroRiskPanel({ risk, cfg }: { risk: RiskState; cfg: StrategyConfig }) {
  const modeLabel = risk.mode === "LOW" ? "LOW RISK" : "HIGH RISK";
  const explain = explainMode(risk, cfg);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pre-Market Risk Output</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 p-4">
            <div className="flex items-center gap-2">
              <Badge>{modeLabel}</Badge>
              <span className="text-xs text-neutral-500">
                As-of close:{" "}
                <span className="font-semibold text-neutral-800">
                  {risk.asOfCloseDate ?? "—"}
                </span>
              </span>
            </div>

            <div className="mt-3 text-xs text-neutral-500">
              TODAY RISK % (pre-market)
            </div>
            <div className="mt-1 text-4xl font-black tracking-tight text-neutral-900">
              {fmtPct(risk.todayRiskPct)}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-neutral-700">
              <div>
                Today date:{" "}
                <span className="font-semibold text-neutral-900">
                  {risk.todayDate}
                </span>
              </div>
              <div>
                Equity used:{" "}
                <span className="font-semibold text-neutral-900">
                  {fmtMoney(risk.equityAsOfClose)}
                </span>
              </div>
              <div>
                Allowed risk $:{" "}
                <span className="font-semibold text-neutral-900">
                  {fmtMoney(risk.allowedRiskDollars)}
                </span>
              </div>
            </div>

            <div className="mt-3 rounded-xl bg-neutral-100 p-3">
              <div className="text-xs font-mono text-neutral-900 space-y-1">
                {explain.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 p-4">
            <div className="text-xs text-neutral-500">
              TOMORROW (forecast + scenarios)
            </div>
            <div className="mt-1 text-4xl font-black tracking-tight text-neutral-900">
              {fmtPct(risk.tomorrowBaseRiskPct)}
            </div>

            <div className="mt-2 text-sm text-neutral-700">
              Tomorrow date:{" "}
              <span className="font-semibold text-neutral-900">
                {risk.tomorrowDate}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 text-sm">
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                <div className="text-xs text-neutral-500">If today closes as WIN</div>
                <div className="text-lg font-bold text-neutral-900">
                  {fmtPct(risk.tomorrowIfWinRiskPct)}
                </div>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                <div className="text-xs text-neutral-500">If today closes as LOSS</div>
                <div className="text-lg font-bold text-neutral-900">
                  {fmtPct(risk.tomorrowIfLossRiskPct)}
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs text-neutral-500">
              Rule: LOW 0.10% until 2 wins → HIGH 3% until 1 loss → repeat (daily only)
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
