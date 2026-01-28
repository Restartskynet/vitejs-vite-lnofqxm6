import { useMemo, useState } from 'react';
import { Card } from '../ui';
import { formatMoney, formatDate, cn } from '../../lib/utils';
import type { DailyEquity } from '../../engine/types';

interface EquityChartProps {
  data: DailyEquity[];
  className?: string;
}

export function EquityChart({ data, className }: EquityChartProps) {
  const [showDrawdown, setShowDrawdown] = useState(false);
  const [useAccountEquity, setUseAccountEquity] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const safeData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data.filter((d) => d && typeof d.tradingEquity === 'number');
  }, [data]);

  const chartData = useMemo(() => {
    if (!safeData || safeData.length === 0) return null;

    const values = safeData.map((d) => (useAccountEquity ? (d.accountEquity ?? d.tradingEquity) : d.tradingEquity));

    if (values.length === 0) return null;

    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    let peak = values[0];
    const drawdowns = values.map((v) => {
      if (v > peak) peak = v;
      return peak > 0 ? ((peak - v) / peak) * 100 : 0;
    });

    return { values, minVal, maxVal, range, drawdowns };
  }, [safeData, useAccountEquity]);

  if (!chartData || safeData.length === 0) {
    return (
      <Card className={className}>
        <div className="text-center py-12 text-ink-muted">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          <p className="text-sm">Import trades to populate equity curve</p>
        </div>
      </Card>
    );
  }

  const width = 100;
  const height = 40;
  const padding = 2;

  const displayValues = showDrawdown ? chartData.drawdowns : chartData.values;
  const displayMin = showDrawdown ? 0 : chartData.minVal;
  const displayMax = showDrawdown ? Math.max(...chartData.drawdowns, 1) : chartData.maxVal;
  const displayRange = displayMax - displayMin || 1;
  const axisMaxLabel = showDrawdown ? '0%' : formatMoney(displayMax);
  const axisMinLabel = showDrawdown ? `-${displayMax.toFixed(1)}%` : formatMoney(displayMin);
  const startDateLabel = safeData[0]?.date ? formatDate(safeData[0].date) : '';
  const endDateLabel = safeData[safeData.length - 1]?.date ? formatDate(safeData[safeData.length - 1].date) : '';
  const yAxisLabel = showDrawdown ? 'Drawdown %' : 'Equity ($)';
  const xAxisLabel = 'Date';

  const pointCount = displayValues.length;
  const points = displayValues
    .map((v, i) => {
      const x = padding + (pointCount > 1 ? i / (pointCount - 1) : 0.5) * (width - 2 * padding);
      const y = height - padding - ((v - displayMin) / displayRange) * (height - 2 * padding);
      return `${x},${y}`;
    })
    .join(' ');

  const areaPath = `M${padding},${height - padding} L${points} L${width - padding},${height - padding} Z`;

  const startValue = chartData.values[0];
  const endValue = chartData.values[chartData.values.length - 1];
  const change = endValue - startValue;
  const changePct = startValue !== 0 ? (change / startValue) * 100 : 0;
  const isPositive = change >= 0;

  return (
    <Card className={className}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Equity & drawdown</h3>
          <p className="text-xs text-ink-muted">{safeData.length} trading days</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDrawdown(false)}
            aria-pressed={!showDrawdown}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
              !showDrawdown ? 'bg-sky-500/20 text-sky-300 border-sky-400/40' : 'bg-white/5 text-ink-muted border-white/10'
            )}
          >
            Equity
          </button>
          <button
            onClick={() => setShowDrawdown(true)}
            aria-pressed={showDrawdown}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
              showDrawdown ? 'bg-red-500/20 text-red-300 border-red-400/40' : 'bg-white/5 text-ink-muted border-white/10'
            )}
          >
            Drawdown
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setUseAccountEquity(true)}
          aria-pressed={useAccountEquity}
          className={cn(
            'px-2 py-1 rounded text-[10px] font-medium transition-all',
            useAccountEquity ? 'bg-white/10 text-white' : 'text-ink-muted hover:text-slate-200'
          )}
        >
          Account equity
        </button>
        <button
          onClick={() => setUseAccountEquity(false)}
          aria-pressed={!useAccountEquity}
          className={cn(
            'px-2 py-1 rounded text-[10px] font-medium transition-all',
            !useAccountEquity ? 'bg-white/10 text-white' : 'text-ink-muted hover:text-slate-200'
          )}
        >
          Trading equity
        </button>
        <span className="text-[10px] text-ink-muted self-center">
          {useAccountEquity ? 'Includes adjustments' : 'Trades only'}
        </span>
      </div>

      <div className="relative h-32 mb-4" onMouseLeave={() => setHoveredIndex(null)}>
        <div className="absolute left-0 top-0 text-[10px] text-ink-muted">{axisMaxLabel}</div>
        <div className="absolute left-0 bottom-0 text-[10px] text-ink-muted">{axisMinLabel}</div>
        <div className="absolute right-0 top-0 text-[10px] text-ink-muted">{yAxisLabel}</div>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full"
          preserveAspectRatio="none"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const idx = Math.round(x * (safeData.length - 1));
            setHoveredIndex(Math.max(0, Math.min(idx, safeData.length - 1)));
          }}
        >
          <defs>
            <linearGradient id={`gradient-${showDrawdown ? 'dd' : 'eq'}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={showDrawdown ? '#ef4444' : isPositive ? '#10b981' : '#ef4444'} stopOpacity="0.3" />
              <stop offset="100%" stopColor={showDrawdown ? '#ef4444' : isPositive ? '#10b981' : '#ef4444'} stopOpacity="0" />
            </linearGradient>
          </defs>

          <path d={areaPath} fill={`url(#gradient-${showDrawdown ? 'dd' : 'eq'})`} />
          <polyline points={points} fill="none" stroke={showDrawdown ? '#ef4444' : isPositive ? '#10b981' : '#ef4444'} strokeWidth="0.5" />

          {hoveredIndex !== null && pointCount > 1 && (
            <>
              <line
                x1={padding + (hoveredIndex / (pointCount - 1)) * (width - 2 * padding)}
                y1={padding}
                x2={padding + (hoveredIndex / (pointCount - 1)) * (width - 2 * padding)}
                y2={height - padding}
                stroke="white"
                strokeWidth="0.3"
                strokeDasharray="1,1"
              />
              <circle
                cx={padding + (hoveredIndex / (pointCount - 1)) * (width - 2 * padding)}
                cy={height - padding - ((displayValues[hoveredIndex] - displayMin) / displayRange) * (height - 2 * padding)}
                r="1"
                fill="white"
              />
            </>
          )}
        </svg>

        {hoveredIndex !== null && safeData[hoveredIndex] && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 p-2 rounded-lg bg-slate-800 border border-white/10 text-xs z-10">
            <p className="text-ink-muted">{safeData[hoveredIndex].date}</p>
            <p className="text-white font-medium">
              {showDrawdown ? `-${chartData.drawdowns[hoveredIndex].toFixed(2)}%` : formatMoney(chartData.values[hoveredIndex])}
            </p>
            {safeData[hoveredIndex].dayPnL !== undefined && (
              <p className={cn('text-xs', safeData[hoveredIndex].dayPnL >= 0 ? 'text-emerald-300' : 'text-red-300')}>
                Day: {safeData[hoveredIndex].dayPnL >= 0 ? '+' : ''}
                {formatMoney(safeData[hoveredIndex].dayPnL)}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[10px] text-ink-muted mb-2">
        <span>{startDateLabel}</span>
        <span>{endDateLabel}</span>
      </div>

      <div className="flex items-center justify-between text-[10px] text-ink-muted mb-4">
        <span>Y: {yAxisLabel}</span>
        <span>X: {xAxisLabel}</span>
      </div>

      <div className="flex items-center justify-between text-xs">
        <div>
          <span className="text-ink-muted">Start:</span>
          <span className="text-white ml-1">{formatMoney(startValue)}</span>
        </div>
        <div className={cn('font-medium', isPositive ? 'text-emerald-300' : 'text-red-300')}>
          {isPositive ? '+' : ''}
          {formatMoney(change)} ({isPositive ? '+' : ''}{changePct.toFixed(2)}%)
        </div>
        <div>
          <span className="text-ink-muted">End:</span>
          <span className="text-white ml-1">{formatMoney(endValue)}</span>
        </div>
      </div>
    </Card>
  );
}
