// src/App.tsx
import { useEffect, useMemo, useState } from "react";
import type { DailyRow, ImportWarning, Metrics, RiskState, Trade } from "./types/models";
import { importWebullOrders } from "./importers/webullOrdersImporter";
import { buildPositionSessions } from "./engine/positionSessions";
import { aggregateDaily } from "./engine/dailyAggregator";
import { computeRiskState, STRATEGY } from "./engine/riskEngine";
import { computeMetrics } from "./engine/metrics";

import { UploadCard } from "./components/UploadCard";
import { WarningsCard } from "./components/WarningsCard";
import { HeroRiskPanel } from "./components/HeroRiskPanel";
import { MetricsCard } from "./components/MetricsCard";
import { DailyChart } from "./components/DailyChart";
import { TradesTable } from "./components/TradesTable";
import { RiskSizer } from "./components/RiskSizer";

export default function App() {
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [startingEquity, setStartingEquity] = useState<string>("20000");
  const [warnings, setWarnings] = useState<ImportWarning[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [risk, setRisk] = useState<RiskState>(() => computeRiskState([], 20000, STRATEGY));
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  const startingEquityNum = useMemo(() => {
    const n = Number(startingEquity);
    return Number.isFinite(n) ? n : 0;
  }, [startingEquity]);

  const derivedDaily = useMemo(() => aggregateDaily(trades, startingEquityNum), [trades, startingEquityNum]);
  const derivedRisk = useMemo(() => computeRiskState(trades, startingEquityNum, STRATEGY), [trades, startingEquityNum]);
  const derivedMetrics = useMemo(() => computeMetrics(trades, derivedDaily), [trades, derivedDaily]);

  useEffect(() => {
    setDaily(derivedDaily);
    setRisk(derivedRisk);
    setMetrics(derivedMetrics);
  }, [derivedDaily, derivedRisk, derivedMetrics]);

  async function handleFile(file: File) {
    setStatus("loading");
    setWarnings([]);

    try {
      const text = await file.text();
      const imported = importWebullOrders(text);

      const sessions = buildPositionSessions(imported.fills);

      const allWarnings: ImportWarning[] = [
        ...(imported.warnings ?? []),
        ...(sessions.warnings ?? []),
      ].map((w) => ({
        level: w.level ?? "info",
        code: w.code ?? "unknown_warning",
        message: w.message ?? "Warning",
        meta: w.meta,
      }));

      setWarnings(allWarnings);
      setTrades(sessions.trades);
      setStatus("ready");
    } catch (e: any) {
      setStatus("error");
      setWarnings([
        {
          level: "error",
          code: "import_failed",
          message: e?.message ?? "Import failed",
        },
      ]);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Restart Risk</h1>
          <p className="text-muted-foreground">
            Upload Webull Orders Records CSV → deterministic fills → trades → risk throttle output.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-6">
            <UploadCard
              onFile={handleFile}
              status={status}
              startingEquity={startingEquity}
              setStartingEquity={setStartingEquity}
            />
            <WarningsCard warnings={warnings} />
          </div>

          <div className="lg:col-span-2 space-y-6">
            <HeroRiskPanel risk={risk} cfg={STRATEGY} />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <MetricsCard metrics={metrics} />
              <RiskSizer risk={risk} />
            </div>
            <DailyChart daily={daily} />
            <TradesTable trades={trades} />
          </div>
        </div>
      </div>
    </div>
  );
}
