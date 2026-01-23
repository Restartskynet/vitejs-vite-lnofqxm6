import { useMemo, useState } from "react";
import "./index.css";

import type { DailyRow, StrategyConfig, Trade, RiskState, ImportWarning } from "./types/models";

import { importWebullOrdersCsv } from "./importers/webullOrdersImporter";
import { buildPositionSessions } from "./engine/positionSessions";
import { aggregateDaily } from "./engine/dailyAggregator";
import { computeRiskState } from "./engine/riskEngine";
import { computeMetrics } from "./engine/metrics";
import { fmtMoney } from "./utils/numbers";

import { UploadCard } from "./components/UploadCard";
import { HeroRiskPanel } from "./components/HeroRiskPanel";
import { RiskSizer } from "./components/RiskSizer";
import { KpiCards } from "./components/KpiCards";
import { EquityChart } from "./components/EquityChart";
import { DrawdownChart } from "./components/DrawdownChart";
import { TradesTable } from "./components/TradesTable";
import { WarningsCard } from "./components/WarningsCard";
import { Input } from "./components/ui/input";
import { Card, CardContent } from "./components/ui/card";

const STRATEGY: StrategyConfig = {
  lowRiskPct: 0.001,      // 0.10%
  highRiskPct: 0.03,      // 3.00%
  lowWinsNeeded: 2,
  highLossesNeeded: 1,
};

export default function App() {
  const [fileName, setFileName] = useState("");
  const [startingEquity, setStartingEquity] = useState<number>(20000);

  const [warnings, setWarnings] = useState<ImportWarning[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);

  // ✅ Derived state recalculates automatically
  const daily: DailyRow[] = useMemo(() => {
    return aggregateDaily(trades, Number(startingEquity));
  }, [trades, startingEquity]);

  const risk: RiskState | null = useMemo(() => {
    // Always computable (even empty daily)
    return computeRiskState(daily, Number(startingEquity), STRATEGY);
  }, [daily, startingEquity]);

  const metrics = useMemo(() => computeMetrics(trades, daily), [trades, daily]);

  async function handleFile(file: File) {
    setFileName(file.name);

    const text = await file.text();

    const imp = importWebullOrdersCsv(text);
    const built = buildPositionSessions(imp.fills);

    const nextWarnings: ImportWarning[] = [
      ...imp.warnings,
      ...built.warnings,
      {
        level: "info",
        message: `Rows: ${imp.stats.totalRows} • Filled: ${imp.stats.filledRows} • Used fills: ${imp.stats.usedRows} • Built trades: ${built.trades.length}`,
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

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <UploadCard
              fileName={fileName}
              onPickFile={handleFile}
              metaText={trades.length ? `${trades.length.toLocaleString()} position sessions built` : undefined}
            />
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-neutral-500">Starting Equity</div>
              <div className="mt-2">
                <Input
                  type="number"
                  value={startingEquity}
                  onChange={(e) => setStartingEquity(Number(e.target.value))}
                />
              </div>

              <div className="mt-3 text-xs text-neutral-500">
                Equity & risk recalc instantly when this changes.
              </div>

              <div className="mt-3 text-xs text-neutral-600">
                Current equity (if loaded):{" "}
                <span className="font-semibold text-neutral-900">
                  {metrics.endingEquity !== null ? fmtMoney(metrics.endingEquity) : "—"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <WarningsCard warnings={warnings} />

        {risk ? (
          <>
            <HeroRiskPanel risk={risk} cfg={STRATEGY} />
            <RiskSizer risk={risk} />
          </>
        ) : null}

        {trades.length > 0 ? <KpiCards m={metrics} /> : null}

        {daily.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <EquityChart daily={daily} />
            <DrawdownChart daily={daily} />
          </div>
        ) : null}

        {trades.length > 0 ? <TradesTable trades={trades} /> : null}

        {trades.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
            Upload your Webull Orders CSV to generate the dashboard.
          </div>
        ) : null}
      </div>
    </div>
  );
}
