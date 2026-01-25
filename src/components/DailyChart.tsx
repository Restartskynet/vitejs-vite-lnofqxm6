import type { DailyRow } from "../types/models";
import { EquityChart } from "./EquityChart";
import { DrawdownChart } from "./DrawdownChart";

// Kept for backwards compatibility with earlier App.tsx imports.
export function DailyChart({ daily }: { daily: DailyRow[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <EquityChart daily={daily} />
      <DrawdownChart daily={daily} />
    </div>
  );
}

export default DailyChart;
