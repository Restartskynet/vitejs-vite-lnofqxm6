import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import type { DailyRow } from "../types/models";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export function EquityChart({ daily }: { daily: DailyRow[] }) {
  const opt: EChartsOption = {
    tooltip: { trigger: "axis" },
    grid: { left: 55, right: 20, top: 30, bottom: 45 },
    xAxis: { type: "category", data: daily.map((d) => d.date) },
    yAxis: { type: "value" },
    series: [
      {
        type: "line",
        data: daily.map((d) => d.accountEquity),
        showSymbol: false,
        smooth: true,
      },
    ],
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Equity Curve (EOD)</CardTitle>
      </CardHeader>
      <CardContent>
        <ReactECharts option={opt} style={{ height: 320, width: "100%" }} />
      </CardContent>
    </Card>
  );
}
