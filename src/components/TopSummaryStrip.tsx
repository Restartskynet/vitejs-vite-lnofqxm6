import { useDashboardState } from '../../stores/dashboardStore';
import { formatMoney, formatPercent } from '../../lib/utils';
import { cn } from '../../lib/utils';

interface KPIItemProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

function KPIItem({ label, value, subValue, trend, className }: KPIItemProps) {
  return (
    <div
      className={cn(
        'px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]',
        className
      )}
    >
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </p>
      <div className="flex items-baseline gap-1.5">
        <span
          className="text-lg font-bold text-white tabular-nums"
          style={{ fontFeatureSettings: '"tnum"' }}
        >
          {value}
        </span>
        {trend && trend !== 'neutral' && (
          <span
            className={cn(
              'text-xs',
              trend === 'up' ? 'text-emerald-400' : 'text-red-400'
            )}
          >
            {trend === 'up' ? '↑' : '↓'}
          </span>
        )}
      </div>
      {subValue && (
        <p className="text-xs text-slate-500 mt-0.5">{subValue}</p>
      )}
    </div>
  );
}

interface TopSummaryStripProps {
  className?: string;
}

export function TopSummaryStrip({ className }: TopSummaryStripProps) {
  const { hasData, metrics, currentRisk } = useDashboardState();

  // Empty state - show placeholder KPIs
  if (!hasData) {
    return (
      <div
        className={cn(
          'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2',
          className
        )}
      >
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
    <div
      className={cn(
        'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2',
        className
      )}
    >
      <KPIItem
        label="Win Rate"
        value={formatPercent(metrics.winRate, 1)}
        subValue={`${metrics.wins}W / ${metrics.losses}L`}
        trend={metrics.winRate >= 0.5 ? 'up' : 'down'}
      />
      <KPIItem
        label="Total P&L"
        value={formatMoney(metrics.totalPnL, true)}
        trend={metrics.totalPnL >= 0 ? 'up' : 'down'}
      />
      <KPIItem label="Trades" value={metrics.totalTrades} />
      <KPIItem
        label="Profit Factor"
        value={metrics.profitFactor > 0 ? metrics.profitFactor.toFixed(2) : '--'}
        trend={metrics.profitFactor >= 1.5 ? 'up' : metrics.profitFactor < 1 ? 'down' : 'neutral'}
      />
      <KPIItem
        label="Max Drawdown"
        value={formatPercent(Math.abs(metrics.maxDrawdownPct), 1)}
        trend="down"
      />
      <KPIItem
        label="Streak"
        value={
          metrics.currentStreak > 0
            ? `${metrics.currentStreak}${metrics.streakType === 'WIN' ? 'W' : 'L'}`
            : '--'
        }
        trend={metrics.streakType === 'WIN' ? 'up' : metrics.streakType === 'LOSS' ? 'down' : 'neutral'}
      />
    </div>
  );
}

// Compact version for mobile
export function CompactSummaryStrip({ className }: TopSummaryStripProps) {
  const { hasData, metrics, currentRisk } = useDashboardState();

  if (!hasData) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-4 overflow-x-auto py-2 scrollbar-hide',
        className
      )}
    >
      <div className="flex items-center gap-2 whitespace-nowrap">
        <span className="text-xs text-slate-500">P&L</span>
        <span
          className={cn(
            'text-sm font-semibold',
            metrics.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'
          )}
        >
          {formatMoney(metrics.totalPnL, true)}
        </span>
      </div>
      <div className="w-px h-4 bg-white/10" />
      <div className="flex items-center gap-2 whitespace-nowrap">
        <span className="text-xs text-slate-500">Win</span>
        <span className="text-sm font-semibold text-white">
          {formatPercent(metrics.winRate, 0)}
        </span>
      </div>
      <div className="w-px h-4 bg-white/10" />
      <div className="flex items-center gap-2 whitespace-nowrap">
        <span className="text-xs text-slate-500">Trades</span>
        <span className="text-sm font-semibold text-white">{metrics.totalTrades}</span>
      </div>
    </div>
  );
}