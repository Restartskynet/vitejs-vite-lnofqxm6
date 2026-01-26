import { useDashboardState } from '../../stores/dashboardStore';
import { formatMoney, formatPercent, cn } from '../../lib/utils';

function KPIItem({ label, value, subValue, trend }: { label: string; value: string | number; subValue?: string; trend?: 'up' | 'down' | 'neutral' }) {
  return (
    <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-lg font-bold text-white tabular-nums">{value}</span>
        {trend && trend !== 'neutral' && (
          <span className={cn('text-xs', trend === 'up' ? 'text-emerald-400' : 'text-red-400')}>
            {trend === 'up' ? '↑' : '↓'}
          </span>
        )}
      </div>
      {subValue && <p className="text-xs text-slate-500 mt-0.5">{subValue}</p>}
    </div>
  );
}

export function TopSummaryStrip({ className }: { className?: string }) {
  const { hasData, metrics } = useDashboardState();

  if (!hasData) {
    return (
      <div className={cn('grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2', className)}>
        <KPIItem label="Win Rate" value="--%" subValue="0W / 0L" />
        <KPIItem label="Total P&L" value="$0.00" />
        <KPIItem label="Trades" value="0" />
        <KPIItem label="Profit Factor" value="--" />
        <KPIItem label="Max Drawdown" value="--%" />
        <KPIItem label="Streak" value="--" />
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2', className)}>
      <KPIItem label="Win Rate" value={formatPercent(metrics.winRate, 1)} subValue={`${metrics.wins}W / ${metrics.losses}L`} trend={metrics.winRate >= 0.5 ? 'up' : 'down'} />
      <KPIItem label="Total P&L" value={formatMoney(metrics.totalPnL, true)} trend={metrics.totalPnL >= 0 ? 'up' : 'down'} />
      <KPIItem label="Trades" value={metrics.totalTrades} />
      <KPIItem label="Profit Factor" value={metrics.profitFactor > 0 ? metrics.profitFactor.toFixed(2) : '--'} trend={metrics.profitFactor >= 1.5 ? 'up' : metrics.profitFactor < 1 ? 'down' : 'neutral'} />
      <KPIItem label="Max Drawdown" value={formatPercent(Math.abs(metrics.maxDrawdownPct), 1)} trend="down" />
      <KPIItem label="Streak" value={metrics.currentStreak > 0 ? `${metrics.currentStreak}${metrics.streakType === 'WIN' ? 'W' : 'L'}` : '--'} trend={metrics.streakType === 'WIN' ? 'up' : metrics.streakType === 'LOSS' ? 'down' : 'neutral'} />
    </div>
  );
}