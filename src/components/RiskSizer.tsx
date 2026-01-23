import { useMemo, useState } from "react";
import type { RiskState } from "../types/models";
import { fmtMoney } from "../utils/numbers";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";

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
    <Card>
      <CardHeader>
        <CardTitle>Position Sizer (Entry / Stop → Max Shares)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <div className="mb-1 text-xs text-neutral-500">Entry</div>
            <Input value={entry} onChange={(e) => setEntry(e.target.value)} />
          </div>

          <div>
            <div className="mb-1 text-xs text-neutral-500">Stop</div>
            <Input value={stop} onChange={(e) => setStop(e.target.value)} />
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            {calc ? (
              calc.ok ? (
                <div className="space-y-1">
                  <div className="text-xs text-neutral-500">Risk / share</div>
                  <div className="text-lg font-bold text-neutral-900">
                    {fmtMoney(calc.perShare)}
                  </div>

                  <div className="text-xs text-neutral-500">Max shares</div>
                  <div className="text-2xl font-black text-neutral-900">
                    {calc.maxShares.toLocaleString()}
                  </div>

                  <div className="text-xs text-neutral-500">Risk used</div>
                  <div className="text-sm font-semibold text-neutral-900">
                    {fmtMoney(calc.riskUsed)}
                  </div>

                  <div className="text-xs text-neutral-500">Position value</div>
                  <div className="text-sm font-semibold text-neutral-900">
                    {fmtMoney(calc.positionValue)}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-red-600">
                    ⚠️ {calc.error}
                  </div>
                  <div className="text-xs text-neutral-700">
                    {calc.suggestion}
                  </div>
                </div>
              )
            ) : (
              <div className="text-sm text-neutral-600">Enter valid Entry + Stop</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
