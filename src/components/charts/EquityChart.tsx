import { useMemo, useState } from 'react';
import { Card } from '../ui';
import { formatMoney, cn } from '../../lib/utils';
import type { DailyEquity } from '../../engine/types';

interface EquityChartProps {
  data: DailyEquity[];
  className?: string;
}

export function EquityChart({ data, className }: EquityChartProps) {
  const [showDrawdown, setShowDrawdown] = useState(false);
  const [useAccountEquity, setUseAccountEquity] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const chartData = useMemo(() => {
    if (data.length === 0) return null;

    const values = data.map(d => useAccountEquity ? (d.accountEquity ?? d.tradingEquity) : d.tradingEquity);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    // Calculate drawdown
    let peak = values[0];
    const drawdowns = values.map(v => {
      if (v > peak) peak = v;
      return ((peak - v) / peak) * 100;
    });

    return { values, minVal, maxVal, range, drawdowns };
  }, [data, useAccountEquity]);

  if (!chartData || data.length === 0) {
    return (
      <Card className={className}>
        <div className="text-center py-12 text-slate-500">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          <p className="text-sm">Import trades to see your equity curve</p>
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

  const points = displayValues.map((v, i) => {
    const x = padding + (i / (displayValues.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((v - displayMin) / displayRange) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  const areaPath = `M${padding},${height - padding} L${points} L${width - padding},${height - padding} Z`;

  const startValue = chartData.values[0];
  const endValue = chartData.values[chartData.values.length - 1];
  const change = endValue - startValue;
  const changePct = (change / startValue) * 100;
  const isPositive = change >= 0;

  return (
    <Card className={className}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Equity Curve</h3>
          <p className="text-xs text-slate-500">{data.length} days</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDrawdown(false)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              !showDrawdown ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : 'bg-white/5 text-slate-400 border border-white/10'
            )}
          >
            Equity
          </button>
          <button
            onClick={() => setShowDrawdown(true)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              showDrawdown ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-white/5 text-slate-400 border border-white/10'
            )}
          >
            Drawdown
          </button>
        </div>
      </div>

      {/* Toggle Account/Trading */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setUseAccountEquity(true)}
          className={cn(
            'px-2 py-1 rounded text-[10px] font-medium transition-all',
            useAccountEquity ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
          )}
        >
          Account
        </button>
        <button
          onClick={() => setUseAccountEquity(false)}
          className={cn(
            'px-2 py-1 rounded text-[10px] font-medium transition-all',
            !useAccountEquity ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
          )}
        >
          Trading
        </button>
      </div>

      {/* Chart */}
      <div 
        className="relative h-32 mb-4"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-full"
          preserveAspectRatio="none"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const idx = Math.round(x * (data.length - 1));
            setHoveredIndex(Math.max(0, Math.min(idx, data.length - 1)));
          }}
        >
          <defs>
            <linearGradient id={`gradient-${showDrawdown ? 'dd' : 'eq'}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={showDrawdown ? '#ef4444' : isPositive ? '#10b981' : '#ef4444'} stopOpacity="0.3" />
              <stop offset="100%" stopColor={showDrawdown ? '#ef4444' : isPositive ? '#10b981' : '#ef4444'} stopOpacity="0" />
            </linearGradient>
          </defs>
          
          <path d={areaPath} fill={`url(#gradient-${showDrawdown ? 'dd' : 'eq'})`} />
          <polyline
            points={points}
            fill="none"
            stroke={showDrawdown ? '#ef4444' : isPositive ? '#10b981' : '#ef4444'}
            strokeWidth="0.5"
          />

          {/* Hover line */}
          {hoveredIndex !== null && (
            <>
              <line
                x1={padding + (hoveredIndex / (displayValues.length - 1)) * (width - 2 * padding)}
                y1={padding}
                x2={padding + (hoveredIndex / (displayValues.length - 1)) * (width - 2 * padding)}
                y2={height - padding}
                stroke="white"
                strokeWidth="0.3"
                strokeDasharray="1,1"
              />
              <circle
                cx={padding + (hoveredIndex / (displayValues.length - 1)) * (width - 2 * padding)}
                cy={height - padding - ((displayValues[hoveredIndex] - displayMin) / displayRange) * (height - 2 * padding)}
                r="1"
                fill="white"
              />
            </>
          )}
        </svg>

        {/* Tooltip */}
        {hoveredIndex !== null && data[hoveredIndex] && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 p-2 rounded-lg bg-slate-800 border border-white/10 text-xs z-10">
            <p className="text-slate-400">{data[hoveredIndex].date}</p>
            <p className="text-white font-medium">
              {showDrawdown 
                ? `-${chartData.drawdowns[hoveredIndex].toFixed(2)}%`
                : formatMoney(chartData.values[hoveredIndex])
              }
            </p>
            {data[hoveredIndex].dayPnL !== undefined && (
              <p className={cn(
                'text-xs',
                data[hoveredIndex].dayPnL >= 0 ? 'text-emerald-400' : 'text-red-400'
              )}>
                Day: {data[hoveredIndex].dayPnL >= 0 ? '+' : ''}{formatMoney(data[hoveredIndex].dayPnL)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-between text-xs">
        <div>
          <span className="text-slate-500">Start:</span>
          <span className="text-white ml-1">{formatMoney(startValue)}</span>
        </div>
        <div className={cn('font-medium', isPositive ? 'text-emerald-400' : 'text-red-400')}>
          {isPositive ? '+' : ''}{formatMoney(change)} ({isPositive ? '+' : ''}{changePct.toFixed(2)}%)
        </div>
        <div>
          <span className="text-slate-500">End:</span>
          <span className="text-white ml-1">{formatMoney(endValue)}</span>
        </div>
      </div>
    </Card>
  );
}