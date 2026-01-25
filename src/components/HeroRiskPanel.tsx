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
  const expl = explainMode(risk, cfg);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>2) Restart Throttle Output</CardTitle>
          <div className="text-sm text-muted-foreground mt-1">
            As-of last closed trade:{" "}
            <span className="font-medium">
              {risk.asOfCloseDate ?? "—"}
            </span>
          </div>
        </div>
        <Badge variant={mode === "HIGH" ? "default" : "secondary"}>
          {mode}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4">
            <div className="text-xs text-muted-foreground">Equity (as-of close)</div>
            <div className="text-lg font-semibold mt-1">
              {fmtMoney(risk.equityAsOfClose)}
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="text-xs text-muted-foreground">Risk % (next trade)</div>
            <div className="text-lg font-semibold mt-1">
              {fmtPct(risk.todayRiskPct)}
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="text-xs text-muted-foreground">Allowed risk dollars</div>
            <div className="text-lg font-semibold mt-1">
              {fmtMoney(risk.allowedRiskDollars)}
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-2">
          <div className="font-semibold">{expl.title}</div>
          <div className="text-sm text-muted-foreground">{expl.subtitle}</div>
          <ul className="list-disc pl-5 text-sm space-y-1">
            {expl.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
          <div className="text-xs text-muted-foreground pt-2">{expl.footer}</div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="font-semibold mb-2">Forecast (state machine)</div>
          <div className="text-sm text-muted-foreground mb-3">
            This is purely the throttle logic: “what mode/risk% would you be in after the next trade result?”
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Base (no next trade yet)</div>
              <div className="text-base font-semibold mt-1">{fmtPct(risk.tomorrowBaseRiskPct)}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">If next trade is a WIN</div>
              <div className="text-base font-semibold mt-1">{fmtPct(risk.tomorrowIfWinRiskPct)}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">If next trade is a LOSS</div>
              <div className="text-base font-semibold mt-1">{fmtPct(risk.tomorrowIfLossRiskPct)}</div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground mt-3">
            Market date: <span className="font-medium">{risk.todayDate}</span> →{" "}
            <span className="font-medium">{risk.tomorrowDate}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
