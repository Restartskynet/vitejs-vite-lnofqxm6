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
  const { hasData, currentRisk, settings } = useDashboardState();
  const isHigh = currentRisk.mode === 'HIGH';

  return (
    <Card glow={hasData ? (isHigh ? 'high' : 'low') : 'none'} noPadding className={className}>
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
                <p className="text-slate-400 mt-3">
                  Max risk: <span className="text-white font-semibold">{formatMoney(currentRisk.allowedRiskDollars)}</span>
                  <span className="text-slate-600 mx-2">•</span>
                  Equity: <span className="text-white font-semibold">{formatMoney(currentRisk.equity)}</span>
                </p>
              </div>

              {/* Forecast */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowUpIcon />
                    <span className="text-xs text-emerald-400 font-medium uppercase">If Win</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-400">
                    {formatPercent(currentRisk.forecast.ifWin.riskPct)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{currentRisk.forecast.ifWin.mode} mode</p>
                </div>

                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowDownIcon />
                    <span className="text-xs text-red-400 font-medium uppercase">If Loss</span>
                  </div>
                  <p className="text-2xl font-bold text-red-400">
                    {formatPercent(currentRisk.forecast.ifLoss.riskPct)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{currentRisk.forecast.ifLoss.mode} mode</p>
                </div>
              </div>
            </>
          ) : (
            // Empty state
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center mx-auto mb-5">
                <UploadIcon />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Pre-Market Risk Output</h3>
              <p className="text-slate-400 mb-4 max-w-sm mx-auto">
                Import your Webull CSV to calculate your risk allocation
              </p>
              <div className="space-y-2 text-left max-w-xs mx-auto">
                <p className="text-sm text-slate-500">
                  <span className="text-white font-semibold">Starting equity:</span> {formatMoney(settings.startingEquity)}
                </p>
                <p className="text-sm text-slate-500">
                  <span className="text-white font-semibold">Initial risk:</span> 3.00% ({formatMoney(settings.startingEquity * 0.03)})
                </p>
              </div>
              <Link 
                to="/upload" 
                className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Import Trades
              </Link>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
