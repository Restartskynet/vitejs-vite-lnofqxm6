import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import type { DailyRow } from "../types/models";
import { TrendingUp } from "lucide-react";

export function EquityChart({ daily }: { daily: DailyRow[] }) {
  const opt: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: { 
      trigger: "axis",
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: '#475569',
      textStyle: { color: '#e2e8f0' }
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
        data: daily.map((d) => d.accountEquity),
        showSymbol: false,
        smooth: true,
        lineStyle: { color: '#10b981', width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(16, 185, 129, 0.3)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0)' }
            ]
          }
        }
      },
    ],
  };

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-emerald-400" />
        Equity Curve (EOD)
      </h3>
      <ReactECharts option={opt} style={{ height: 320, width: "100%" }} />
      {daily.length > 0 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-slate-400">Start: ${daily[0].accountEquity.toFixed(2)}</span>
          <span className="text-emerald-400 font-semibold">Now: ${daily[daily.length - 1].accountEquity.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}