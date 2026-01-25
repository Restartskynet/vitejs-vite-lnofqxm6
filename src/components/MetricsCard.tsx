import type { Metrics } from "../types/models";
import { KpiCards } from "./KpiCards";

// Kept for backwards compatibility with earlier App.tsx imports.
export function MetricsCard({ metrics }: { metrics: Metrics | null }) {
  return <KpiCards metrics={metrics} />;
}

export default MetricsCard;
