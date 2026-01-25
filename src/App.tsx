// src/App.tsx
import { useMemo, useState } from "react";
import "./index.css";

import { UploadCard } from "./components/UploadCard";
import { HeroRiskPanel } from "./components/HeroRiskPanel";
import { RiskSizer } from "./components/RiskSizer";
import WarningsCard from "./components/WarningsCard";
import { KpiCards } from "./components/KpiCards";
import { EquityChart } from "./components/EquityChart";
import { DrawdownChart } from "./components/DrawdownChart";
import { TradesTable } from "./components/TradesTable";

import { importWebullOrdersCsv } from "./importers/webullOrdersImporter";
import { buildPositionSessions } from "./engine/positionSessions";
import { aggregateDaily } from "./engine/dailyAggregator";
import { computeMetrics } from "./engine/metrics";
import { computeRiskState } from "./engine/riskEngine";

import type {
  DailyRow,
  ImportWarning,
  Metrics,
  StrategyConfig,
  Trade,
} from "./types/models";

import { fmtMoney } from "./utils/numbers";

const STRATEGY: StrategyConfig = {
  lowRiskPct: 0.001,
  highRiskPct: 0.03,
  lowWinsNeeded: 2,
  highLossesNeeded: 1,
};

function normalizeWarning(w: string | ImportWarning): ImportWarning {
  if (typeof w === "string") return { level: "warning", message: w };

  // unify legacy/variant levels
  if (w.level === "warn") return { ...w, level: "warning" };
  return w;
}

export default function App() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [startingEquity, setStartingEquity] = useState<string>("20000");

  const [trades, setTrades] = useState<Trade[]>([]);
  const [warnings, setWarnings] = useState<ImportWarning[]>([]);

  const daily: DailyRow[] = useMemo(() => {
    return aggregateDaily(trades, Number(startingEquity));
  }, [trades, startingEquity]);

  const metrics: Metrics = useMemo(() => {
    return computeMetrics(trades, daily);
  }, [trades, daily]);

  const risk = useMemo(() => {
    return computeRiskState(daily, Number(startingEquity), STRATEGY);
  }, [daily, startingEquity]);

  const currentEquity = useMemo(() => {
    if (!daily.length) return null;
    return daily[daily.length - 1].equityClose;
  }, [daily]);

  async function handleFile(file: File) {
    setFileName(file.name);

    const text = await file.text();

    // 1) Import fills
    const imp = importWebullOrdersCsv(text);

    // 2) Build sessions -> trades (your engine already does this)
    const built = buildPositionSessions(imp.fills);

    // 3) Normalize warnings into ImportWarning[]
    const nextWarnings: ImportWarning[] = [
      ...(imp.warnings ?? []).map(normalizeWarning),
      ...(built.warnings ?? []).map(normalizeWarning),
      {
        level: "info",
        message: `Rows: ${imp.stats.totalRows} • Filled: ${imp.stats.filledRows} • Used: ${imp.stats.usedRows} • Built trades: ${built.trades.length}`,
      },
    ];

    setWarnings(nextWarnings);
    setTrades(built.trades);
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5">
        <div className="flex flex-col gap-1">
          <div className="text-2xl font-black tracking-tight text-neutral-900">
            Webull → Risk Strategy Dashboard
          </div>
          <div className="text-sm text-neutral-600">
            Upload Webull Orders export • Position sessions built automatically • Risk output runs automatically
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <UploadCard
            fileName={fileName}
            onPickFile={handleFile}
            metaText={
              currentEquity === null
                ? "Upload your Webull Orders CSV to generate the dashboard."
                : `As-of close: ${daily[daily.length - 1].date} • Equity: ${fmtMoney(currentEquity)} • Trades: ${trades.length}`
            }
          />

          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-neutral-900">
              Starting Equity
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                value={startingEquity}
                onChange={(e) => setStartingEquity(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-lg"
              />
            </div>

            <div className="mt-2 text-xs text-neutral-500">
              Current equity (if loaded):{" "}
              <span className="font-semibold text-neutral-800">
                {currentEquity === null ? "—" : fmtMoney(currentEquity)}
              </span>
            </div>
          </div>
        </div>

        <HeroRiskPanel risk={risk} cfg={STRATEGY} />

        <RiskSizer risk={risk} />

        <WarningsCard warnings={warnings} />

        <KpiCards m={metrics} />

        {daily.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <EquityChart daily={daily} />
            <DrawdownChart daily={daily} />
          </div>
        ) : null}

        {trades.length > 0 ? <TradesTable trades={trades} /> : null}
      </div>
    </div>
  );
}
