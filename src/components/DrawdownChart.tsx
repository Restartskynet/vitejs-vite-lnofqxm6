import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import type { DailyRow } from "../types/models";
import { AlertTriangle } from "lucide-react";

export function DrawdownChart({ daily }: { daily: DailyRow[] }) {
  const opt: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: "axis",
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: '#475569',
      textStyle: { color: '#e2e8f0' },
      valueFormatter: (v) => `${Number(v).toFixed(2)}%`,
    },
    grid: { left: 55, right: 20, top: 30, bottom: 45 },
    xAxis: { 
      type: "category", 
      data: daily.map((d) => d.date),
      axisLine: { lineStyle: { color: '#475569' } },
      axisLabel: { color: '#94a3b8' }
    },
    yAxis: { 
      type: "value",
      axisLine: { lineStyle: { color: '#475569' } },
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#334155', type: 'dashed' } }
    },
    series: [
      {
        type: "line",
        data: daily.map((d) => d.drawdownPct * 100),
        showSymbol: false,
        smooth: true,
        lineStyle: { color: '#f59e0b', width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(245, 158, 11, 0.3)' },
              { offset: 1, color: 'rgba(245, 158, 11, 0)' }
            ]
          }
        }
      },
    ],
  };

  const maxDD = daily.length > 0 ? Math.min(...daily.map(d => d.drawdownPct)) * 100 : 0;

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-400" />
        Drawdown (%)
      </h3>
      <ReactECharts option={opt} style={{ height: 240, width: "100%" }} />
      {daily.length > 0 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-slate-400">Peak: 0%</span>
          <span className="text-amber-400 font-semibold">Max: {maxDD.toFixed(2)}%</span>
        </div>
      )}
    </div>
  );
}