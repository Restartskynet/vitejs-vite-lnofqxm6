// src/App.tsx
import { useMemo, useState } from "react";
import type { DailyRow, ImportWarning, Metrics, RiskState } from "./types/models";
import { importWebullOrders } from "./importers/webullOrdersImporter";
import { buildPositionSessions } from "./engine/positionSessions";
import { aggregateDaily } from "./engine/dailyAggregator";
import { computeRiskState, STRATEGY } from "./engine/riskEngine";
import { computeMetrics } from "./engine/metrics";

import { UploadCard } from "./components/UploadCard";
import { WarningsCard } from "./components/WarningsCard";
import { HeroRiskPanel } from "./components/HeroRiskPanel";
import { RiskSizer } from "./components/RiskSizer";
import { EquityChart } from "./components/EquityChart";
import { DrawdownChart } from "./components/DrawdownChart";
import { TradesTable } from "./components/TradesTable";
import { KpiCards } from "./components/KpiCards";

function normalizeWarning(w: string | ImportWarning): ImportWarning {
  if (typeof w === "string") return { level: "warning", message: w, action: "Review" };
  return w;
}

export default function App() {
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [startingEquity, setStartingEquity] = useState<string>("25000");

  const [warnings, setWarnings] = useState<ImportWarning[]>([]);
  const [metaText, setMetaText] = useState<string>("");

  const [trades, setTrades] = useState<any[]>([]); // typed via engine return; displayed in TradesTable
  const [risk, setRisk] = useState<RiskState | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  const daily: DailyRow[] = useMemo(() => {
    if (!trades.length) return [];
    return aggregateDaily(trades as any, Number(startingEquity));
  }, [trades, startingEquity]);

  const currentEquity = useMemo(() => {
    if (!daily.length) return null;
    return daily[daily.length - 1].accountEquity;
  }, [daily]);

  const derivedRisk = useMemo(() => {
    return computeRiskState(daily, Number(startingEquity), STRATEGY);
  }, [daily, startingEquity]);

  // Keep risk state in sync for components that want it as state
  useMemo(() => {
    setRisk(derivedRisk);
  }, [derivedRisk]);

  async function handleFile(file: File) {
    setStatus("loading");
    setWarnings([]);
    setTrades([]);
    setMetaText("");

    try {
      const text = await file.text();

      const imp = importWebullOrders(text);

      const nextWarnings: ImportWarning[] = [
        ...imp.warnings.map(normalizeWarning),
        {
          level: "info",
          message: `Rows: ${imp.rawCount} • Filled: ${imp.filledCount} • Used: ${imp.usedCount} • Skipped: ${imp.skippedCount}`,
        },
      ];

      const sessions = buildPositionSessions(imp.fills);
      nextWarnings.push(...sessions.warnings.map(normalizeWarning));

      setTrades(sessions.trades as any);
      setWarnings(nextWarnings);

      const d = aggregateDaily(sessions.trades as any, Number(startingEquity));
      setMetrics(computeMetrics(sessions.trades as any, d));

      setMetaText(
        `Imported: ${file.name} • Days: ${d.length} • Last: ${d.length ? d[d.length - 1].date : "—"} • Equity: ${
          d.length ? d[d.length - 1].accountEquity.toFixed(2) : "—"
        }`
      );

      setStatus("ready");
    } catch (e: any) {
      setStatus("error");
      setWarnings([{ level: "error", message: e?.message ?? "Unknown error" }]);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">Restart Risk Dashboard</h1>
          <p className="text-sm text-slate-600">
            Local-first CSV import → trades → daily equity → deterministic risk mode (LOW/HIGH) → position sizing.
          </p>
          {metaText && <p className="text-xs text-slate-500">{metaText}</p>}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <UploadCard
            onFile={handleFile}
            status={status}
            startingEquity={startingEquity}
            setStartingEquity={setStartingEquity}
          />
          <HeroRiskPanel risk={risk ?? derivedRisk} cfg={STRATEGY} />
        </div>

        <WarningsCard warnings={warnings} />

        <KpiCards metrics={metrics} />

        <div className="grid gap-4 md:grid-cols-2">
          <RiskSizer risk={risk ?? derivedRisk} />
          <div className="rounded-2xl border bg-white p-4">
            <div className="text-sm font-semibold text-slate-800">Current equity</div>
            <div className="text-2xl font-semibold text-slate-900">
              {currentEquity == null ? "—" : currentEquity.toFixed(2)}
            </div>
            <div className="text-xs text-slate-500">Based on imported trades + adjustments (if any).</div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <EquityChart daily={daily} />
          <DrawdownChart daily={daily} />
        </div>

        <TradesTable trades={trades as any} />
      </div>
    </div>
  );
}
