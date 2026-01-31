import { useMemo, useState, useEffect } from 'react';
import { Card } from '../ui';
import { formatMoney, formatDate, toISODate, cn } from '../../lib/utils';
import type { DailyEquity } from '../../engine/types';
import { getPresetRange, isValidRange, parseDateInput, type TimeframePreset } from '../../lib/dateRange';

interface EquityChartProps {
  data: DailyEquity[];
  className?: string;
}

const CHART_WIDTH = 700;
const CHART_HEIGHT = 260;
const PADDING = { top: 24, right: 24, bottom: 40, left: 72 };

function getTickValues(min: number, max: number, count: number) {
  const range = max - min || 1;
  const step = range / (count - 1);
  return Array.from({ length: count }, (_, i) => min + step * i);
}

export function EquityChart({ data, className }: EquityChartProps) {
  const [showDrawdown, setShowDrawdown] = useState(false);
  const [timeframe, setTimeframe] = useState<TimeframePreset | 'CUSTOM'>('ALL');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);
  const [appliedCustomRange, setAppliedCustomRange] = useState<{ start: Date; end: Date } | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const safeData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data.filter((d) => d && typeof d.accountEquity === 'number');
  }, [data]);

  const sortedData = useMemo(() => {
    return [...safeData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [safeData]);

  const dataRange = useMemo(() => {
    if (sortedData.length === 0) return null;
    const start = new Date(sortedData[0].date);
    const end = new Date(sortedData[sortedData.length - 1].date);
    return { start, end };
  }, [sortedData]);

  useEffect(() => {
    if (timeframe !== 'CUSTOM' || !dataRange) return;
    if (!customStart && !customEnd) {
      setCustomStart(toISODate(dataRange.start));
      setCustomEnd(toISODate(dataRange.end));
    }
  }, [customStart, customEnd, dataRange, timeframe]);

  useEffect(() => {
    if (timeframe !== 'CUSTOM' || !dataRange || appliedCustomRange) return;
    const endOfRange = new Date(dataRange.end);
    endOfRange.setHours(23, 59, 59, 999);
    setAppliedCustomRange({ start: dataRange.start, end: endOfRange });
  }, [appliedCustomRange, dataRange, timeframe]);

  const activeRange = useMemo(() => {
    if (!dataRange) return null;
    if (timeframe === 'CUSTOM') return appliedCustomRange;
    return getPresetRange(timeframe, dataRange.start, dataRange.end);
  }, [appliedCustomRange, dataRange, timeframe]);

  const filteredData = useMemo(() => {
    if (!activeRange) return sortedData;
    const startTime = activeRange.start.getTime();
    const endTime = activeRange.end.getTime();
    return sortedData.filter((d) => {
      const time = new Date(d.date).getTime();
      return time >= startTime && time <= endTime;
    });
  }, [activeRange, sortedData]);

  const chartData = useMemo(() => {
    if (filteredData.length === 0) return null;
    const values = filteredData.map((d) => d.accountEquity);
    if (values.length === 0) return null;

    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    let peak = values[0];
    const drawdowns = values.map((v) => {
      if (v > peak) peak = v;
      return peak > 0 ? ((peak - v) / peak) * 100 : 0;
    });

    return { values, drawdowns, minVal, maxVal, range };
  }, [filteredData]);

  if (safeData.length === 0) {
    return (
      <Card className={className}>
        <div className="text-center py-12 text-ink-muted">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          <p className="text-sm">Import trades to populate the equity curve.</p>
          <p className="text-xs text-ink-muted mt-2">Go to Import Trades to start your first run.</p>
        </div>
      </Card>
    );
  }

  const pointCount = chartData ? chartData.values.length : 0;
  const drawableWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const drawableHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const displayValues = chartData ? (showDrawdown ? chartData.drawdowns : chartData.values) : [];
  const displayMin = chartData ? (showDrawdown ? 0 : chartData.minVal) : 0;
  const displayMax = chartData
    ? (showDrawdown ? Math.max(...chartData.drawdowns, 1) : chartData.maxVal)
    : 1;
  const displayRange = displayMax - displayMin || 1;

  const points = displayValues.map((value, index) => {
    const x = PADDING.left + (pointCount > 1 ? (index / (pointCount - 1)) * drawableWidth : drawableWidth / 2);
    const y = PADDING.top + (1 - (value - displayMin) / displayRange) * drawableHeight;
    return { x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`)
    .join(' ');

  const yTicks = getTickValues(displayMin, displayMax, 4);
  const xTickIndices = [0, Math.floor(pointCount * 0.33), Math.floor(pointCount * 0.66), pointCount - 1]
    .filter((value, index, array) => array.indexOf(value) === index && value >= 0 && value < pointCount);

  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;
  const hoveredData = hoveredIndex !== null ? filteredData[hoveredIndex] : null;
  const hasRangeData = Boolean(chartData) && filteredData.length > 0;

  const timeframes: Array<{ label: string; value: TimeframePreset | 'CUSTOM' }> = [
    { label: '1W', value: '1W' },
    { label: '1M', value: '1M' },
    { label: '3M', value: '3M' },
    { label: '6M', value: '6M' },
    { label: 'YTD', value: 'YTD' },
    { label: '1Y', value: '1Y' },
    { label: 'ALL', value: 'ALL' },
    { label: 'Custom', value: 'CUSTOM' },
  ];

  return (
    <Card className={className}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-white">Equity curve</h3>
          <p className="text-xs text-ink-muted">{filteredData.length} trading days · Account equity</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowDrawdown(false)}
            aria-pressed={!showDrawdown}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
              !showDrawdown ? 'bg-[rgb(var(--accent-info)/0.2)] text-[rgb(var(--accent-info))] border-[rgb(var(--accent-info)/0.4)]' : 'bg-white/5 text-ink-muted border-white/10'
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

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {timeframes.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setTimeframe(option.value)}
            aria-pressed={timeframe === option.value}
            className={cn(
              'px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-all border',
              timeframe === option.value
                ? 'bg-[rgb(var(--accent-info)/0.22)] text-[rgb(var(--accent-info))] border-[rgb(var(--accent-info)/0.5)] shadow-[0_0_18px_rgb(var(--accent-glow)/0.35)]'
                : 'bg-white/5 text-ink-muted border-white/10 hover:border-white/20'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {timeframe === 'CUSTOM' && (
        <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.02] p-4 max-h-64 overflow-y-auto">
          <p className="text-xs text-ink-muted mb-3">
            Choose a custom date range for account equity. Dates must be in chronological order.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="equity-start-date" className="text-[10px] uppercase tracking-wider text-ink-muted">
                Start Date
              </label>
              <input
                id="equity-start-date"
                type="date"
                value={customStart}
                onChange={(event) => setCustomStart(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/30"
              />
            </div>
            <div>
              <label htmlFor="equity-end-date" className="text-[10px] uppercase tracking-wider text-ink-muted">
                End Date
              </label>
              <input
                id="equity-end-date"
                type="date"
                value={customEnd}
                onChange={(event) => setCustomEnd(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/30"
              />
            </div>
          </div>
          {customError && <p className="mt-3 text-xs text-red-300">{customError}</p>}
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => {
                const startDate = parseDateInput(customStart);
                const endDate = parseDateInput(customEnd);
                if (endDate) {
                  endDate.setHours(23, 59, 59, 999);
                }
                if (!isValidRange(startDate, endDate)) {
                  setCustomError('Start date must be before or equal to end date.');
                  return;
                }
                setCustomError(null);
                setAppliedCustomRange({ start: startDate!, end: endDate! });
              }}
              className="rounded-lg border border-[rgb(var(--accent-info)/0.5)] bg-[rgb(var(--accent-info)/0.2)] px-3 py-2 text-xs font-semibold text-[rgb(var(--accent-info))] transition-all hover:bg-[rgb(var(--accent-info)/0.3)]"
            >
              Apply range
            </button>
            <button
              type="button"
              onClick={() => {
                if (!dataRange) return;
                const resetEnd = new Date(dataRange.end);
                resetEnd.setHours(23, 59, 59, 999);
                setCustomStart(toISODate(dataRange.start));
                setCustomEnd(toISODate(dataRange.end));
                setAppliedCustomRange({ start: dataRange.start, end: resetEnd });
                setCustomError(null);
              }}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-ink-muted hover:text-white"
            >
              Reset to full range
            </button>
          </div>
        </div>
      )}

      <div className="relative" onMouseLeave={() => setHoveredIndex(null)}>
        {hasRangeData ? (
          <>
            <svg
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              className="w-full h-64"
              preserveAspectRatio="xMinYMin meet"
              onMouseMove={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                const x = (event.clientX - rect.left) / rect.width;
                const idx = Math.round(x * (pointCount - 1));
                setHoveredIndex(Math.max(0, Math.min(idx, pointCount - 1)));
              }}
            >
              <defs>
                <linearGradient id="equity-line" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(var(--accent-high))" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="rgb(var(--accent-high))" stopOpacity="0" />
                </linearGradient>
              </defs>

              {yTicks.map((tick) => {
                const y = PADDING.top + (1 - (tick - displayMin) / displayRange) * drawableHeight;
                return (
                  <g key={tick}>
                    <line x1={PADDING.left} x2={CHART_WIDTH - PADDING.right} y1={y} y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray="2,3" />
                  </g>
                );
              })}

              <path d={linePath} fill="none" stroke="rgb(var(--accent-high))" strokeWidth="2" />
              <path d={`${linePath} L${points[points.length - 1].x},${CHART_HEIGHT - PADDING.bottom} L${points[0].x},${CHART_HEIGHT - PADDING.bottom} Z`} fill="url(#equity-line)" />

              {hoveredPoint && (
                <g>
                  <line
                    x1={hoveredPoint.x}
                    x2={hoveredPoint.x}
                    y1={PADDING.top}
                    y2={CHART_HEIGHT - PADDING.bottom}
                    stroke="rgba(255,255,255,0.35)"
                    strokeDasharray="3,4"
                  />
                  <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r={4} fill="rgb(var(--accent-high))" />
                </g>
              )}

              {yTicks.map((tick) => {
                const y = PADDING.top + (1 - (tick - displayMin) / displayRange) * drawableHeight;
                return (
                  <text key={tick} x={PADDING.left - 12} y={y + 4} textAnchor="end" className="fill-ink-muted text-[10px]">
                    {showDrawdown ? `${tick.toFixed(1)}%` : formatMoney(tick)}
                  </text>
                );
              })}

              {xTickIndices.map((index) => {
                const x = points[index].x;
                return (
                  <text key={index} x={x} y={CHART_HEIGHT - 12} textAnchor="middle" className="fill-ink-muted text-[10px]">
                    {filteredData[index]?.date ? formatDate(filteredData[index].date) : ''}
                  </text>
                );
              })}
            </svg>

            {hoveredPoint && hoveredData && (
              <div
                className="absolute top-4 right-4 rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2 text-xs text-white shadow-lg"
                style={{ minWidth: '160px' }}
              >
                <p className="text-ink-muted">{formatDate(hoveredData.date)}</p>
                <p className="text-sm font-semibold text-white">
                  {showDrawdown
                    ? `Drawdown ${chartData!.drawdowns[hoveredIndex ?? 0].toFixed(2)}%`
                    : formatMoney(chartData!.values[hoveredIndex ?? 0])}
                </p>
                {hoveredData.dayPnL !== undefined && !showDrawdown && (
                  <p className={cn('text-xs', hoveredData.dayPnL >= 0 ? 'text-emerald-300' : 'text-red-300')}>
                    Day {hoveredData.dayPnL >= 0 ? '+' : ''}{formatMoney(hoveredData.dayPnL)}
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] text-sm text-ink-muted">
            No equity points found in the selected range.
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] text-ink-muted">
        <span>Y: {showDrawdown ? 'Drawdown %' : 'Equity ($)'}</span>
        <span>X: Date</span>
      </div>
    </Card>
  );
}
