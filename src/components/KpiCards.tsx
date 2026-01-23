import type { Metrics } from "../engine/metrics";
import { fmtMoney } from "../utils/numbers";
import { Card, CardContent } from "./ui/card";

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-neutral-500">{label}</div>
        <div className="mt-1 text-xl font-extrabold text-neutral-900">{value}</div>
      </CardContent>
    </Card>
  );
}

export function KpiCards({ m }: { m: Metrics }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Tile label="Total Trades" value={m.totalTrades.toLocaleString()} />
      <Tile label="Win Rate" value={`${m.winRatePct.toFixed(2)}%`} />
      <Tile label="Total PnL" value={fmtMoney(m.totalPnL)} />
      <Tile label="Max Drawdown" value={`${(m.maxDrawdownPct * 100).toFixed(2)}%`} />
    </div>
  );
}
