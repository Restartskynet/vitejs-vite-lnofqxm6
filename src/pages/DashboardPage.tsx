import { useState } from 'react';
import { useDashboard } from '../stores/dashboardStore';
import { Page, Section } from '../components/layout';
import { Card, Badge, Button } from '../components/ui';
import { EquityChart } from '../components/charts';
import { formatMoney, formatPercent, cn } from '../lib/utils';

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
                          variant={currentRisk.mode === 'HIGH' ? 'success' : 'warning'} 
                          size="lg"
                        >
                          {currentRisk.mode} MODE
                        </Badge>
                        <p className="text-xs text-slate-500 mt-1">{strategy.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Today's Risk</p>
                      <p className={cn(
                        'text-3xl font-bold',
                        currentRisk.mode === 'HIGH' ? 'text-emerald-400' : 'text-amber-400'
                      )} style={{ fontFeatureSettings: '"tnum"' }}>
                        {formatPercent(currentRisk.todayRiskPct, 2)}
                      </p>
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Allowed Risk</p>
                      <p className="text-2xl font-bold text-white" style={{ fontFeatureSettings: '"tnum"' }}>
                        {formatMoney(currentRisk.allowedRiskDollars)}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Account Equity</p>
                      <p className="text-2xl font-bold text-white" style={{ fontFeatureSettings: '"tnum"' }}>
                        {formatMoney(currentRisk.equity)}
                      </p>
                      {totalAdjustments !== 0 && (
                        <p className={cn(
                          'text-xs mt-1',
                          totalAdjustments > 0 ? 'text-emerald-400' : 'text-red-400'
                        )}>
                          {totalAdjustments > 0 ? '+' : ''}{formatMoney(totalAdjustments)} adjustments
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Scenarios */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                        <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">If Win</span>
                      </div>
                      <p className="text-xl font-bold text-emerald-400" style={{ fontFeatureSettings: '"tnum"' }}>
                        {formatPercent(currentRisk.forecast.ifWin.riskPct, 2)}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">→ {currentRisk.forecast.ifWin.mode}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                        <span className="text-[10px] text-red-400 font-semibold uppercase tracking-wider">If Loss</span>
                      </div>
                      <p className="text-xl font-bold text-red-400" style={{ fontFeatureSettings: '"tnum"' }}>
                        {formatPercent(currentRisk.forecast.ifLoss.riskPct, 2)}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">→ {currentRisk.forecast.ifLoss.mode}</p>
                    </div>
                  </div>

                  {/* LOW Mode Progress */}
                  {currentRisk.mode === 'LOW' && (
                    <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      <p className="text-xs text-amber-400">
                        Progress: {currentRisk.lowWinsProgress}/{currentRisk.lowWinsNeeded} wins to return to HIGH
                      </p>
                      <div className="mt-2 h-2 rounded-full bg-amber-500/20 overflow-hidden">
                        <div 
                          className="h-full bg-amber-400 rounded-full transition-all"
                          style={{ width: `${(currentRisk.lowWinsProgress / currentRisk.lowWinsNeeded) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Upload trades to see your risk</h3>
                  <p className="text-sm text-slate-400">Import your Webull CSV to calculate position sizing</p>
                </div>
              )}
            </div>
          </Card>

          {/* Position Sizer */}
          <PositionSizer allowedRisk={currentRisk.allowedRiskDollars} />
        </div>
      </Section>

      {/* KPI Strip */}
      {hasData && (
        <Section className="mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KPICard 
              label="Win Rate" 
              value={formatPercent(metrics.winRate, 1)} 
              subValue={`${metrics.wins}W / ${metrics.losses}L`}
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
              value={`${metrics.currentStreak}${metrics.streakType === 'WIN' ? 'W' : 'L'}`}
              trend={metrics.streakType === 'WIN' ? 'up' : 'down'}
            />
          </div>
        </Section>
      )}

      {/* Equity Chart */}
      {hasData && (
        <Section>
          <EquityChart dailyEquity={dailyEquity} />
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
                    <Badge 
                      variant={
                        trade.outcome === 'WIN' ? 'success' : 
                        trade.outcome === 'LOSS' ? 'danger' : 
                        trade.outcome === 'OPEN' ? 'info' : 'default'
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

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function KPICard({ label, value, subValue, trend }: { 
  label: string; 
  value: string; 
  subValue?: string;
  trend?: 'up' | 'down';
}) {
  return (
    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-bold text-white" style={{ fontFeatureSettings: '"tnum"' }}>
          {value}
        </span>
        {trend && (
          <span className={cn('text-sm', trend === 'up' ? 'text-emerald-400' : 'text-red-400')}>
            {trend === 'up' ? '↑' : '↓'}
          </span>
        )}
      </div>
      {subValue && <p className="text-xs text-slate-500 mt-0.5">{subValue}</p>}
    </div>
  );
}

function PositionSizer({ allowedRisk }: { allowedRisk: number }) {
  const [entry, setEntry] = useState('');
  const [stop, setStop] = useState('');

  const calc = (() => {
    const e = parseFloat(entry);
    const s = parseFloat(stop);
    if (isNaN(e) || isNaN(s) || e <= 0 || s <= 0) return null;
    const rps = Math.abs(e - s);
    if (rps < 0.01) return { error: 'Stop too tight (< $0.01)' };
    const shares = Math.floor(allowedRisk / rps);
    const value = shares * e;
    return { shares, rps, value };
  })();

  return (
    <Card>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
          <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6z" />
          </svg>
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">Position Sizer</h3>
          <p className="text-xs text-slate-500">Max risk: {formatMoney(allowedRisk)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Entry</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
            <input
              type="number"
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              placeholder="0.00"
              step="0.01"
              className="w-full h-11 pl-7 pr-3 rounded-xl bg-white/[0.05] border border-white/10 text-white font-medium placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60"
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Stop</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
            <input
              type="number"
              value={stop}
              onChange={(e) => setStop(e.target.value)}
              placeholder="0.00"
              step="0.01"
              className="w-full h-11 pl-7 pr-3 rounded-xl bg-white/[0.05] border border-white/10 text-white font-medium placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60"
            />
          </div>
        </div>
      </div>

      {calc && 'error' in calc ? (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
          <p className="text-sm text-red-400">{calc.error}</p>
        </div>
      ) : calc ? (
        <div>
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 mb-3">
            <p className="text-[10px] text-emerald-400/70 uppercase tracking-wider mb-1">Max Shares</p>
            <p className="text-3xl font-black text-emerald-400" style={{ fontFeatureSettings: '"tnum"' }}>
              {calc.shares.toLocaleString()}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Risk/Share</p>
              <p className="text-base font-semibold text-white">{formatMoney(calc.rps)}</p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Position</p>
              <p className="text-base font-semibold text-white">{formatMoney(calc.value)}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 text-slate-500">
          <p className="text-sm">Enter entry and stop prices</p>
        </div>
      )}
    </Card>
  );
}