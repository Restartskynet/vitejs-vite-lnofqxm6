import { useMemo, useState, useEffect, useRef } from 'react';
import { Card } from '../ui';
import { formatMoney, formatDate, cn } from '../../lib/utils';
import type { DailyEquity } from '../../engine/types';
import { epochDayToIso, isoToEpochDay, normalizeDateKey } from '../../lib/dateKey';

type TimeframePreset = '1W' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'ALL';

interface EquityChartProps {
  data: DailyEquity[];
  className?: string;
}

type NormalizedEquityPoint = DailyEquity & {
  dateKey: string;
  epochDay: number;
};

type AppliedRange = {
  startEpoch: number;
  endEpoch: number;
  startKey: string;
  endKey: string;
  daysShown: number;
  clamped: boolean;
  desiredDays?: number;
};

const DEFAULT_CHART_WIDTH = 700;
const DEFAULT_CHART_HEIGHT = 260;
const PADDING = { top: 24, right: 24, bottom: 40, left: 72 };

function getTickValues(min: number, max: number, count: number) {
  const range = max - min || 1;
  const step = range / (count - 1);
  return Array.from({ length: count }, (_, i) => min + step * i);
}

function clampEpochDay(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function parseIsoParts(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month, day };
}

function shiftEpochByMonths(epochDay: number, months: number) {
  const { year, month, day } = parseIsoParts(epochDayToIso(epochDay));
  const shifted = new Date(Date.UTC(year, month - 1 + months, day));
  return Math.floor(shifted.getTime() / 86400000);
}

function getPresetStartEpoch(preset: TimeframePreset, endEpoch: number) {
  switch (preset) {
    case '1W':
      return endEpoch - 6;
    case '1M':
      return shiftEpochByMonths(endEpoch, -1);
    case '3M':
      return shiftEpochByMonths(endEpoch, -3);
    case '6M':
      return shiftEpochByMonths(endEpoch, -6);
    case '1Y':
      return shiftEpochByMonths(endEpoch, -12);
    case 'YTD': {
      const { year } = parseIsoParts(epochDayToIso(endEpoch));
      return isoToEpochDay(`${year}-01-01`);
    }
    case 'ALL':
    default:
      return endEpoch;
  }
}

export function EquityChart({ data, className }: EquityChartProps) {
  const [showDrawdown, setShowDrawdown] = useState(false);
  const [timeframe, setTimeframe] = useState<TimeframePreset | 'CUSTOM'>('ALL');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);
  const [appliedCustomRange, setAppliedCustomRange] = useState<AppliedRange | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredPosition, setHoveredPosition] = useState<{ x: number; y: number } | null>(null);
  const [chartBounds, setChartBounds] = useState<{ width: number; height: number } | null>(null);
  const [rangeToast, setRangeToast] = useState<string | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });
  const chartRef = useRef<HTMLDivElement | null>(null);

  const normalizedData = useMemo(() => {
    if (!Array.isArray(data)) return [] as NormalizedEquityPoint[];
    const cleaned: NormalizedEquityPoint[] = [];
    data.forEach((point) => {
      if (!point || typeof point.accountEquity !== 'number') return;
      const dateKey = normalizeDateKey(point.date);
      if (!dateKey) {
        return;
      }
      cleaned.push({ ...point, dateKey, epochDay: isoToEpochDay(dateKey) });
    });
    return cleaned;
  }, [data]);

  const sortedData = useMemo(() => {
    return [...normalizedData].sort((a, b) => a.epochDay - b.epochDay);
  }, [normalizedData]);

  const dataRange = useMemo(() => {
    if (sortedData.length === 0) return null;
    const startEpoch = sortedData[0].epochDay;
    const endEpoch = sortedData[sortedData.length - 1].epochDay;
    return {
      startEpoch,
      endEpoch,
      startKey: epochDayToIso(startEpoch),
      endKey: epochDayToIso(endEpoch),
      totalDays: endEpoch - startEpoch + 1,
    };
  }, [sortedData]);

  useEffect(() => {
    if (timeframe !== 'CUSTOM' || !dataRange) return;
    if (!customStart && !customEnd) {
      setCustomStart(dataRange.startKey);
      setCustomEnd(dataRange.endKey);
    }
  }, [customStart, customEnd, dataRange, timeframe]);

  useEffect(() => {
    if (timeframe !== 'CUSTOM' || !dataRange || appliedCustomRange) return;
    setAppliedCustomRange({
      startEpoch: dataRange.startEpoch,
      endEpoch: dataRange.endEpoch,
      startKey: dataRange.startKey,
      endKey: dataRange.endKey,
      daysShown: dataRange.totalDays,
      clamped: false,
    });
  }, [appliedCustomRange, dataRange, timeframe]);

  const activeRange = useMemo<AppliedRange | null>(() => {
    if (!dataRange) return null;
    if (timeframe === 'CUSTOM') return appliedCustomRange;
    const rawStart = timeframe === 'ALL' ? dataRange.startEpoch : getPresetStartEpoch(timeframe, dataRange.endEpoch);
    const clampedStart = clampEpochDay(rawStart, dataRange.startEpoch, dataRange.endEpoch);
    const endEpoch = dataRange.endEpoch;
    const desiredDays = endEpoch - rawStart + 1;
    const daysShown = endEpoch - clampedStart + 1;
    return {
      startEpoch: clampedStart,
      endEpoch,
      startKey: epochDayToIso(clampedStart),
      endKey: dataRange.endKey,
      daysShown,
      clamped: clampedStart !== rawStart,
      desiredDays,
    };
  }, [appliedCustomRange, dataRange, timeframe]);

  const filteredData = useMemo(() => {
    if (!activeRange) return sortedData;
    return sortedData.filter((point) => point.epochDay >= activeRange.startEpoch && point.epochDay <= activeRange.endEpoch);
  }, [activeRange, sortedData]);

  const chartData = useMemo(() => {
    if (filteredData.length === 0) return null;
    const values = filteredData.map((d) => d.accountEquity);
    if (values.length === 0) return null;

    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const drawdowns = filteredData.map((point) => {
      const dd = typeof point.drawdownPct === 'number' ? point.drawdownPct : 0;
      return Math.min(0, dd) * 100;
    });

    return { values, drawdowns, minVal, maxVal };
  }, [filteredData]);

  const appliedRangeLabel = useMemo(() => {
    if (!activeRange) return null;
    if (timeframe === 'CUSTOM') {
      if (!appliedCustomRange) return null;
      return `Range: ${activeRange.startKey} → ${activeRange.endKey}`;
    }
    if (activeRange.clamped) {
      return `Range: ${activeRange.startKey} → ${activeRange.endKey}`;
    }
    return null;
  }, [activeRange, appliedCustomRange, timeframe]);

  const headerStats = useMemo(() => {
    if (filteredData.length === 0) return null;
    const startEquity = filteredData[0].accountEquity;
    const endEquity = filteredData[filteredData.length - 1].accountEquity;
    const net = endEquity - startEquity;
    const netPct = startEquity !== 0 ? net / startEquity : 0;
    const maxDrawdownPct = filteredData.reduce(
      (min, point) => Math.min(min, point.drawdownPct ?? 0),
      0
    );
    return {
      startEquity,
      endEquity,
      net,
      netPct,
      maxDrawdownPct: Math.abs(maxDrawdownPct),
    };
  }, [filteredData]);

  const pointCount = chartData ? chartData.values.length : 0;
  const chartWidth = chartSize.width || DEFAULT_CHART_WIDTH;
  const chartHeight = chartSize.height || DEFAULT_CHART_HEIGHT;
  const drawableWidth = chartWidth - PADDING.left - PADDING.right;
  const drawableHeight = chartHeight - PADDING.top - PADDING.bottom;

  const displayValues = chartData ? (showDrawdown ? chartData.drawdowns : chartData.values) : [];
  const drawdownMin = chartData ? Math.min(...chartData.drawdowns, 0) : 0;
  const displayMin = chartData ? (showDrawdown ? drawdownMin : chartData.minVal) : 0;
  const displayMax = chartData ? (showDrawdown ? 0 : chartData.maxVal) : 1;
  const displayRange = displayMax - displayMin || 1;

  const points = displayValues.map((value, index) => {
    const x = PADDING.left + (pointCount > 1 ? (index / (pointCount - 1)) * drawableWidth : drawableWidth / 2);
    const y = PADDING.top + (1 - (value - displayMin) / displayRange) * drawableHeight;
    return { x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`)
    .join(' ');

  const baselineY = showDrawdown
    ? PADDING.top + (1 - (0 - displayMin) / displayRange) * drawableHeight
    : chartHeight - PADDING.bottom;

  const yTicks = getTickValues(displayMin, displayMax, 3);
  const xTickIndices = [0, Math.floor(pointCount * 0.5), pointCount - 1]
    .filter((value, index, array) => array.indexOf(value) === index && value >= 0 && value < pointCount);

  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;
  const hoveredData = hoveredIndex !== null ? filteredData[hoveredIndex] : null;
  const previousData = hoveredIndex !== null && hoveredIndex > 0 ? filteredData[hoveredIndex - 1] : null;
  const hasRangeData = Boolean(chartData) && filteredData.length > 0;
  const equityDelta = hoveredData && previousData ? hoveredData.accountEquity - previousData.accountEquity : null;

  const lineColor = showDrawdown ? 'rgb(var(--accent-danger))' : 'rgb(var(--accent-low))';
  const areaId = showDrawdown ? 'drawdown-line' : 'equity-line';
  const netTone = headerStats ? (headerStats.net >= 0 ? 'text-emerald-300' : 'text-red-300') : 'text-white';

  const timeframes: Array<{ label: string; value: TimeframePreset | 'CUSTOM' }> = [
    { label: '1W', value: '1W' },
    { label: '1M', value: '1M' },
    { label: '3M', value: '3M' },
    { label: '6M', value: '6M' },
    { label: 'YTD', value: 'YTD' },
    { label: '1Y', value: '1Y' },
    { label: 'ALL', value: 'ALL' },
    { label: 'CUSTOM', value: 'CUSTOM' },
  ];

  const historyDays = dataRange?.totalDays ?? 0;
  const historyLabel = historyDays === 1 ? '1 day of history' : `${historyDays} days of history`;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(hover: none) and (pointer: coarse)');
    const update = () => setIsTouchDevice(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!rangeToast) return;
    const id = window.setTimeout(() => setRangeToast(null), 2600);
    return () => window.clearTimeout(id);
  }, [rangeToast]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!chartRef.current) return;
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const { width, height } = entry.contentRect;
        setChartSize((prev) => {
          if (prev.width === width && prev.height === height) return prev;
          return { width, height };
        });
      });
    });
    observer.observe(chartRef.current);
    return () => observer.disconnect();
  }, []);

  const getPresetDisabledReason = (preset: TimeframePreset) => {
    if (!dataRange || preset === 'ALL') return null;
    const rawStart = getPresetStartEpoch(preset, dataRange.endEpoch);
    const desiredDays = dataRange.endEpoch - rawStart + 1;
    if (dataRange.totalDays < desiredDays) {
      return `Need ${preset} history. You have ${dataRange.totalDays} days.`;
    }
    return null;
  };

  const tooltipMetrics = useMemo(() => {
    if (!hoveredPoint || !hoveredPosition || !chartBounds) return null;
    const tooltipWidth = 180;
    const tooltipHeight = 96;
    const padding = 8;
    const offset = 12;
    const anchorLeft = hoveredPosition.x / chartBounds.width > 0.6;
    const rawLeft = anchorLeft
      ? hoveredPosition.x - tooltipWidth - offset
      : hoveredPosition.x + offset;
    const rawTop = hoveredPosition.y - 24;
    const left = Math.min(
      Math.max(rawLeft, padding),
      chartBounds.width - tooltipWidth - padding
    );
    const top = Math.min(
      Math.max(rawTop, padding),
      chartBounds.height - tooltipHeight - padding
    );
    return { left, top, width: tooltipWidth };
  }, [chartBounds, hoveredPoint, hoveredPosition]);

  if (normalizedData.length === 0) {
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

  return (
    <Card className={className}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-white">Account equity</h3>
          <p className="text-xs text-ink-muted">
            {showDrawdown ? 'Drawdown from peak' : 'End-of-day account equity'}
            {dataRange ? ` · ${historyLabel}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowDrawdown(false)}
            aria-pressed={!showDrawdown}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
              !showDrawdown
                ? 'bg-[rgb(var(--accent-low)/0.2)] text-[rgb(var(--accent-low))] border-[rgb(var(--accent-low)/0.5)] shadow-[0_0_18px_rgb(var(--accent-glow)/0.25)]'
                : 'bg-white/5 text-ink-muted border-white/10'
            )}
          >
            Equity
          </button>
          <button
            onClick={() => setShowDrawdown(true)}
            aria-pressed={showDrawdown}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
              showDrawdown
                ? 'bg-[rgb(var(--accent-danger)/0.2)] text-[rgb(var(--accent-danger))] border-[rgb(var(--accent-danger)/0.5)] shadow-[0_0_18px_rgb(var(--accent-danger)/0.25)]'
                : 'bg-white/5 text-ink-muted border-white/10'
            )}
          >
            Drawdown
          </button>
        </div>
      </div>

      {headerStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">Start equity</p>
            <p className="text-sm font-semibold text-white tabular-nums">{formatMoney(headerStats.startEquity)}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">End equity</p>
            <p className="text-sm font-semibold text-white tabular-nums">{formatMoney(headerStats.endEquity)}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">Net change</p>
            <p className={cn('text-sm font-semibold tabular-nums', netTone)}>
              {headerStats.net >= 0 ? '+' : ''}
              {formatMoney(headerStats.net)}
            </p>
            <p className={cn('text-[11px] tabular-nums', netTone)}>
              {headerStats.netPct >= 0 ? '+' : ''}
              {(headerStats.netPct * 100).toFixed(2)}%
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">Max drawdown</p>
            <p className="text-sm font-semibold text-[rgb(var(--accent-danger))] tabular-nums">
              {(headerStats.maxDrawdownPct * 100).toFixed(2)}%
            </p>
          </div>
        </div>
      )}

      <div className="mb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-2 px-2">
          {timeframes.map((option) => {
            const disabledReason =
              option.value === 'CUSTOM' ? null : getPresetDisabledReason(option.value);
            const isDisabled = Boolean(disabledReason);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  if (isDisabled) {
                    if (isTouchDevice && disabledReason) {
                      setRangeToast(disabledReason);
                    }
                    return;
                  }
                  setTimeframe(option.value);
                }}
                aria-pressed={timeframe === option.value}
                aria-disabled={isDisabled}
                title={!isTouchDevice && isDisabled ? disabledReason ?? undefined : undefined}
                className={cn(
                  'shrink-0 px-4 py-2 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-all border',
                  timeframe === option.value
                    ? 'bg-[rgb(var(--accent-low)/0.22)] text-[rgb(var(--accent-low))] border-[rgb(var(--accent-low)/0.6)] shadow-[0_0_18px_rgb(var(--accent-glow)/0.35)]'
                    : 'bg-white/5 text-ink-muted border-white/10 hover:border-white/20',
                  isDisabled && 'opacity-40 cursor-not-allowed hover:border-white/10'
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        {appliedRangeLabel && (
          <div className="mt-2 text-[11px] text-ink-muted">
            {appliedRangeLabel}
          </div>
        )}
      </div>

      {timeframe === 'CUSTOM' && (
        <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.02] p-4 max-h-64 overflow-y-auto">
          <p className="text-xs text-ink-muted mb-3">
            Choose a custom date range. Dates must be valid and in chronological order.
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
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:outline-none focus:border-[rgb(var(--accent-low)/0.6)] focus:ring-2 focus:ring-[rgb(var(--accent-glow)/0.25)]"
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
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:outline-none focus:border-[rgb(var(--accent-low)/0.6)] focus:ring-2 focus:ring-[rgb(var(--accent-glow)/0.25)]"
              />
            </div>
          </div>
          {customError && <p className="mt-3 text-xs text-red-300">{customError}</p>}
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => {
                if (!dataRange) {
                  setCustomError('No data available to apply a custom range.');
                  return;
                }
                const startKey = normalizeDateKey(customStart);
                const endKey = normalizeDateKey(customEnd);
                if (!startKey || !endKey) {
                  setCustomError('Enter valid dates (YYYY-MM-DD or MM/DD/YYYY).');
                  return;
                }
                const startEpoch = isoToEpochDay(startKey);
                const endEpoch = isoToEpochDay(endKey);
                if (startEpoch > endEpoch) {
                  setCustomError('Start date must be before or equal to end date.');
                  return;
                }
                const clampedStart = clampEpochDay(startEpoch, dataRange.startEpoch, dataRange.endEpoch);
                const clampedEnd = clampEpochDay(endEpoch, dataRange.startEpoch, dataRange.endEpoch);
                if (clampedStart > clampedEnd) {
                  setCustomError('Selected range is outside the available data.');
                  return;
                }
                setCustomError(null);
                setCustomStart(startKey);
                setCustomEnd(endKey);
                setAppliedCustomRange({
                  startEpoch: clampedStart,
                  endEpoch: clampedEnd,
                  startKey: epochDayToIso(clampedStart),
                  endKey: epochDayToIso(clampedEnd),
                  daysShown: clampedEnd - clampedStart + 1,
                  clamped: clampedStart !== startEpoch || clampedEnd !== endEpoch,
                });
              }}
              className="rounded-lg border border-[rgb(var(--accent-low)/0.6)] bg-[rgb(var(--accent-low)/0.2)] px-3 py-2 text-xs font-semibold text-[rgb(var(--accent-low))] transition-all hover:bg-[rgb(var(--accent-low)/0.3)]"
            >
              Apply range
            </button>
            <button
              type="button"
              onClick={() => {
                if (!dataRange) return;
                setCustomStart(dataRange.startKey);
                setCustomEnd(dataRange.endKey);
                setAppliedCustomRange({
                  startEpoch: dataRange.startEpoch,
                  endEpoch: dataRange.endEpoch,
                  startKey: dataRange.startKey,
                  endKey: dataRange.endKey,
                  daysShown: dataRange.totalDays,
                  clamped: false,
                });
                setCustomError(null);
              }}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-ink-muted hover:text-white"
            >
              Reset to full range
            </button>
          </div>
        </div>
      )}

      <div
        ref={chartRef}
        className="relative w-full h-64 lg:h-72"
        onMouseLeave={() => {
          setHoveredIndex(null);
          setHoveredPosition(null);
        }}
      >
        {hasRangeData ? (
          <>
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-full"
              preserveAspectRatio="xMinYMin meet"
              onMouseMove={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                const relativeX = (event.clientX - rect.left) / rect.width;
                const idx = Math.round(relativeX * (pointCount - 1));
                const scaleX = rect.width / chartWidth;
                const scaleY = rect.height / chartHeight;
                setChartBounds({ width: rect.width, height: rect.height });
                setHoveredPosition({
                  x: points[Math.max(0, Math.min(idx, pointCount - 1))].x * scaleX,
                  y: points[Math.max(0, Math.min(idx, pointCount - 1))].y * scaleY,
                });
                setHoveredIndex(Math.max(0, Math.min(idx, pointCount - 1)));
              }}
            >
              <defs>
                <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={lineColor} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
                </linearGradient>
              </defs>

              {yTicks.map((tick) => {
                const y = PADDING.top + (1 - (tick - displayMin) / displayRange) * drawableHeight;
                return (
                  <g key={tick}>
                    <line x1={PADDING.left} x2={chartWidth - PADDING.right} y1={y} y2={y} stroke="rgba(255,255,255,0.12)" strokeDasharray="2,3" />
                  </g>
                );
              })}

              <path
                d={linePath}
                fill="none"
                stroke={lineColor}
                strokeWidth="2"
                className="transition-all duration-[var(--motion-duration-medium)] ease-[var(--motion-ease-standard)]"
              />
              <path
                d={`${linePath} L${points[points.length - 1].x},${baselineY} L${points[0].x},${baselineY} Z`}
                fill={`url(#${areaId})`}
                className="transition-all duration-[var(--motion-duration-medium)] ease-[var(--motion-ease-standard)]"
              />

              {hoveredPoint && (
                <g>
                  <line
                    x1={hoveredPoint.x}
                    x2={hoveredPoint.x}
                    y1={PADDING.top}
                    y2={chartHeight - PADDING.bottom}
                    stroke="rgba(255,255,255,0.35)"
                    strokeDasharray="3,4"
                  />
                  <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r={4} fill={lineColor} />
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
                  <text key={index} x={x} y={chartHeight - 12} textAnchor="middle" className="fill-ink-muted text-[10px]">
                    {filteredData[index]?.dateKey ? formatDate(filteredData[index].dateKey) : ''}
                  </text>
                );
              })}
            </svg>

            {hoveredPoint && hoveredData && tooltipMetrics && (
              <div
                className="absolute rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2 text-xs text-white shadow-lg pointer-events-none"
                style={{ left: tooltipMetrics.left, top: tooltipMetrics.top, minWidth: tooltipMetrics.width }}
              >
                <p className="text-ink-muted">{formatDate(hoveredData.dateKey)}</p>
                <div className="mt-1 space-y-1 text-[11px] text-ink-muted">
                  <div>
                    <span className="block text-[10px] uppercase tracking-wide text-ink-muted">Account equity</span>
                    <span className="text-sm font-semibold text-white tabular-nums">
                      {formatMoney(hoveredData.accountEquity)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Net change</span>
                    <span className={cn('tabular-nums', (equityDelta ?? 0) >= 0 ? 'text-emerald-300' : 'text-red-300')}>
                      {equityDelta === null ? '—' : `${equityDelta >= 0 ? '+' : ''}${formatMoney(equityDelta)}`}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] text-sm text-ink-muted">
            No equity points found in the selected range.
          </div>
        )}
      </div>

      {rangeToast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center sm:hidden">
          <div className="rounded-full border border-white/10 bg-slate-900/90 px-4 py-2 text-xs text-white shadow-lg">
            {rangeToast}
          </div>
        </div>
      )}

    </Card>
  );
}
