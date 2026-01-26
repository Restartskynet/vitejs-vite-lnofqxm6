import { useDashboardState } from '../../stores/dashboardStore';
import { Card, Badge } from '../ui';
import { formatMoney, formatPercent, formatDate, cn } from '../../lib/utils';
import { Link } from 'react-router-dom';

const ArrowUpIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
  </svg>
);

const ArrowDownIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
  </svg>
);

const UploadIcon = () => (
  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
);

export function HeroRiskPanel({ className }: { className?: string }) {
  const { hasData, currentRisk } = useDashboardState();
  const isHigh = currentRisk.mode === 'HIGH';

  return (
    <Card glow={hasData ? (isHigh ? 'success' : 'warning') : 'none'} noPadding className={className}>
      <div className="relative overflow-hidden p-6 sm:p-8">
        {hasData && (
          <div className={cn('absolute inset-0 opacity-30 pointer-events-none', isHigh ? 'bg-gradient-to-br from-emerald-600/30 via-transparent to-transparent' : 'bg-gradient-to-br from-amber-600/30 via-transparent to-transparent')} />
        )}

        <div className="relative">
          {hasData ? (
            <>
              <div className="flex items-center justify-between mb-8">
                <Badge variant={isHigh ? 'high' : 'low'} size="lg" pulse>{currentRisk.mode} Mode</Badge>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">As of</p>
                  <p className="text-sm text-slate-300 font-medium">{formatDate(currentRisk.asOfDate)}</p>
                </div>
              </div>

              <div className="mb-10">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-3 font-medium">Today's Risk</p>
                <div className="flex items-baseline gap-2">
                  <span className={cn('text-7xl sm:text-8xl lg:text-9xl font-black tracking-tighter tabular-nums', isHigh ? 'text-emerald-400' : 'text-amber-400')} style={{ lineHeight: 1 }}>
                    {(currentRisk.todayRiskPct * 100).toFixed(2)}
                  </span>
                  <span className={cn('text-4xl sm:text-5xl font-bold', isHigh ? 'text-emerald-400/60' : 'text-amber-400/60')}>%</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Allowed Risk</p>
                  <p className="text-2xl sm:text-3xl font-bold text-white tabular-nums">{formatMoney(currentRisk.allowedRiskDollars)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Account Equity</p>
                  <p className="text-2xl sm:text-3xl font-bold text-white tabular-nums">{formatMoney(currentRisk.equity)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-emerald-400"><ArrowUpIcon /></span>
                    <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">If Win</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-400 tabular-nums">{formatPercent(currentRisk.forecast.ifWin.riskPct)}</p>
                  <p className="text-xs text-slate-500 mt-1">→ {currentRisk.forecast.ifWin.mode}</p>
                </div>
                <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-red-400"><ArrowDownIcon /></span>
                    <span className="text-[10px] text-red-400 font-semibold uppercase tracking-wider">If Loss</span>
                  </div>
                  <p className="text-2xl font-bold text-red-400 tabular-nums">{formatPercent(currentRisk.forecast.ifLoss.riskPct)}</p>
                  <p className="text-xs text-slate-500 mt-1">→ {currentRisk.forecast.ifLoss.mode}</p>
                </div>
              </div>

              {currentRisk.mode === 'LOW' && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-400">Recovery Progress</span>
                    <span className="text-sm font-medium text-white">{currentRisk.lowWinsProgress} / {currentRisk.lowWinsNeeded} wins</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500" style={{ width: `${(currentRisk.lowWinsProgress / currentRisk.lowWinsNeeded) * 100}%` }} />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center mx-auto mb-5">
                <span className="text-blue-400"><UploadIcon /></span>
              </div>
              <p className="text-xl font-bold text-white mb-2">Upload trades to see your risk</p>
              <p className="text-sm text-slate-400 max-w-xs mx-auto mb-6">Import your Webull CSV to calculate your exact position sizing</p>
              <Link to="/upload" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors">
                Upload CSV
              </Link>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}