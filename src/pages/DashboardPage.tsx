import { useDashboard } from '../stores/dashboardStore';
import { Page, Section } from '../components/layout';
import { Card, Badge, Button } from '../components/ui';
import { EquityChart } from '../components/charts';
import { formatMoney, formatPercent, cn } from '../lib/utils';

// KPI Card component
function KPICard({ 
  label, 
  value, 
  trend 
}: { 
  label: string; 
  value: string; 
  trend?: 'up' | 'down'; 
}) {
  return (
    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={cn(
        'text-xl font-bold',
        trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-white'
      )} style={{ fontFeatureSettings: '"tnum"' }}>
        {value}
      </p>
    </div>
  );
}

export function DashboardPage() {
  const { state } = useDashboard();
  const { currentRisk, metrics, dailyEquity, hasData, isLoading, trades, strategy, adjustments } = state;

  // Calculate adjustment totals
  const totalAdjustments = adjustments.reduce((sum, adj) => sum + adj.amount, 0);

  if (isLoading) {
    return (
      <Page title="Dashboard">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      </Page>
    );
  }

  return (
    <Page title="Dashboard" subtitle="Risk management and position sizing">
      {/* Hero Risk Panel */}
      <Section className="mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Risk Card */}
          <Card className="lg:col-span-2">
            <div className="flex flex-col h-full">
              {hasData ? (
                <>
                  {/* Risk Mode Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center',
                        currentRisk.mode === 'HIGH' 
                          ? 'bg-emerald-500/20 border border-emerald-500/40'
                          : 'bg-amber-500/20 border border-amber-500/40'
                      )}>
                        <svg 
                          className={cn(
                            'w-6 h-6',
                            currentRisk.mode === 'HIGH' ? 'text-emerald-400' : 'text-amber-400'
                          )} 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor" 
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                        </svg>
                      </div>
                      <div>
                        <Badge 
                          variant={currentRisk.mode === 'HIGH' ? 'high' : 'low'} 
                          size="lg" 
                          pulse
                        >
                          {currentRisk.mode} Mode
                        </Badge>
                        <p className="text-xs text-slate-500 mt-1">
                          As of {currentRisk.asOfDate}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-bold text-white" style={{ fontFeatureSettings: '"tnum"' }}>
                        {formatPercent(currentRisk.todayRiskPct)}
                      </p>
                      <p className="text-xs text-slate-500">Today's Risk</p>
                    </div>
                  </div>

                  {/* Risk Details */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Allowed Risk</p>
                      <p className="text-xl font-bold text-white" style={{ fontFeatureSettings: '"tnum"' }}>
                        {formatMoney(currentRisk.allowedRiskDollars)}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Current Equity</p>
                      <p className="text-xl font-bold text-white" style={{ fontFeatureSettings: '"tnum"' }}>
                        {formatMoney(currentRisk.equity)}
                      </p>
                    </div>
                  </div>

                  {/* Forecast */}
                  <div className="mt-auto">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Forecast</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                        <p className="text-[10px] text-emerald-400/80 uppercase">If Win</p>
                        <p className="text-sm font-semibold text-emerald-400">
                          {currentRisk.forecast.ifWin.mode} @ {formatPercent(currentRisk.forecast.ifWin.riskPct)}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                        <p className="text-[10px] text-red-400/80 uppercase">If Loss</p>
                        <p className="text-sm font-semibold text-red-400">
                          {currentRisk.forecast.ifLoss.mode} @ {formatPercent(currentRisk.forecast.ifLoss.riskPct)}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">No Trade Data</h3>
                  <p className="text-sm text-slate-500 mb-4">Import your Webull CSV to get started</p>
                  <Button onClick={() => window.location.href = '/upload'}>
                    Import Trades
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Strategy Info Card */}
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white">{strategy.name}</h3>
                <p className="text-xs text-slate-500">Risk Strategy</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">HIGH Mode</span>
                <span className="text-emerald-400 font-medium">{formatPercent(strategy.highModeRiskPct)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">LOW Mode</span>
                <span className="text-amber-400 font-medium">{formatPercent(strategy.lowModeRiskPct)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Wins to Recover</span>
                <span className="text-white font-medium">{strategy.winsToRecover}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Losses to Drop</span>
                <span className="text-white font-medium">{strategy.lossesToDrop}</span>
              </div>
            </div>
            {currentRisk.mode === 'LOW' && hasData && (
              <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <p className="text-xs text-amber-400">
                  Progress: {currentRisk.lowWinsProgress}/{currentRisk.lowWinsNeeded} wins to HIGH
                </p>
              </div>
            )}
          </Card>
        </div>
      </Section>

      {/* KPI Grid */}
      {hasData && (
        <Section className="mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <KPICard 
              label="Win Rate" 
              value={formatPercent(metrics.winRate)} 
              trend={metrics.winRate >= 0.5 ? 'up' : 'down'}
            />
            <KPICard 
              label="Total P&L" 
              value={formatMoney(metrics.totalPnL)} 
              trend={metrics.totalPnL >= 0 ? 'up' : 'down'}
            />
            <KPICard 
              label="Trades" 
              value={metrics.totalTrades.toString()} 
            />
            <KPICard 
              label="Profit Factor" 
              value={metrics.profitFactor.toFixed(2)} 
              trend={metrics.profitFactor >= 1.5 ? 'up' : 'down'}
            />
            <KPICard 
              label="Max Drawdown" 
              value={formatPercent(metrics.maxDrawdownPct, 1)} 
              trend="down"
            />
            <KPICard 
              label="Streak" 
              value={`${metrics.currentStreak}${metrics.streakType === 'WIN' ? 'W' : metrics.streakType === 'LOSS' ? 'L' : ''}`}
              trend={metrics.streakType === 'WIN' ? 'up' : metrics.streakType === 'LOSS' ? 'down' : undefined}
            />
          </div>
        </Section>
      )}

      {/* Equity Chart - FIX: Changed dailyEquity to data */}
      {hasData && (
        <Section>
          <EquityChart data={dailyEquity} />
        </Section>
      )}

      {/* Recent Trades Preview */}
      {hasData && trades.length > 0 && (
        <Section className="mt-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Recent Trades</h3>
              <Button variant="secondary" size="sm" onClick={() => window.location.href = '/trades'}>
                View All
              </Button>
            </div>
            <div className="space-y-2">
              {trades.slice(0, 5).map((trade) => (
                <div 
                  key={trade.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={trade.side === 'LONG' ? 'success' : 'danger'} size="sm">
                      {trade.side}
                    </Badge>
                    <span className="font-semibold text-white">{trade.symbol}</span>
                    {/* FIX: Changed 'default' to 'neutral' */}
                    <Badge 
                      variant={
                        trade.outcome === 'WIN' ? 'success' : 
                        trade.outcome === 'LOSS' ? 'danger' : 
                        trade.outcome === 'OPEN' ? 'info' : 'neutral'
                      } 
                      size="sm"
                    >
                      {trade.outcome}
                    </Badge>
                  </div>
                  <span className={cn(
                    'font-semibold',
                    trade.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'
                  )} style={{ fontFeatureSettings: '"tnum"' }}>
                    {trade.totalPnL >= 0 ? '+' : ''}{formatMoney(trade.totalPnL)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </Section>
      )}
    </Page>
  );
}