import { useMemo } from 'react';
import { useDashboard } from '../stores/dashboardStore';
import { Page, Section } from '../components/layout';
import { Card, Badge, Button, ModeBadge } from '../components/ui';
import { EquityChart } from '../components/charts';
import { formatMoney, formatPercent, formatDateTime, cn } from '../lib/utils';

type WatchItem = {
  title: string;
  detail: string;
  status: 'on-track' | 'risk' | 'neutral';
  meta?: string;
};

function KPIItem({ label, value, trend }: { label: string; value: string; trend?: 'up' | 'down' }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">{label}</p>
      <p
        className={cn(
          'mt-2 text-xl font-semibold',
          trend === 'up' ? 'text-emerald-300' : trend === 'down' ? 'text-red-300' : 'text-white'
        )}
        style={{ fontFeatureSettings: '"tnum"' }}
      >
        {value}
      </p>
    </div>
  );
}

export function DashboardPage() {
  const { state } = useDashboard();
  const { currentRisk, metrics, dailyEquity, hasData, isLoading, trades, strategy, importHistory } = state;
  const activeTrades = trades.filter((trade) => trade.status === 'ACTIVE');
  const latestImport = importHistory[0];

  const totalExposure = useMemo(() => {
    return activeTrades.reduce((sum, trade) => sum + trade.entryPrice * trade.remainingQty, 0);
  }, [activeTrades]);

  const watchItems: WatchItem[] = useMemo(() => {
    if (!hasData) {
      return [
        {
          title: 'Awaiting import',
          detail: 'Upload a Webull CSV to activate today’s watchlist.',
          status: 'neutral',
        },
      ];
    }

    if (activeTrades.length === 0) {
      return [
        {
          title: 'No open positions',
          detail: 'Risk budget is available for the next qualified setup.',
          status: 'on-track',
        },
        {
          title: 'Rule enforcement',
          detail: 'Keep entries aligned with today’s mode limits.',
          status: 'neutral',
        },
      ];
    }

    return activeTrades.slice(0, 3).map((trade) => ({
      title: `${trade.symbol} ${trade.side === 'LONG' ? 'long' : 'short'}`,
      detail: `Entry ${formatMoney(trade.entryPrice)} · ${trade.remainingQty.toLocaleString()} shares`,
      status: trade.unrealizedPnL >= 0 ? 'on-track' : 'risk',
      meta: trade.stopPrice ? `Stop ${formatMoney(trade.stopPrice)}` : 'Stop not set',
    }));
  }, [activeTrades, hasData]);

  const diagnostics = useMemo(() => {
    if (!latestImport) {
      return {
        label: 'Awaiting data',
        detail: 'No imports yet. Diagnostics appear after your first CSV.',
        status: 'neutral' as const,
      };
    }

    if (latestImport.stats.errorsCount > 0) {
      return {
        label: 'Import warnings',
        detail: `${latestImport.stats.errorsCount} error(s) and ${latestImport.stats.warningsCount} warning(s) detected.`,
        status: 'risk' as const,
      };
    }

    if (latestImport.stats.warningsCount > 0 || latestImport.stats.duplicatesSkipped > 0) {
      return {
        label: 'Diagnostics noted',
        detail: `${latestImport.stats.warningsCount} warnings · ${latestImport.stats.duplicatesSkipped} rows skipped for duplicates.`,
        status: 'neutral' as const,
      };
    }

    return {
      label: 'Clean import',
      detail: 'No warnings or skipped rows detected in the last run.',
      status: 'on-track' as const,
    };
  }, [latestImport]);

  if (isLoading) {
    return (
      <Page title="Dashboard">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      </Page>
    );
  }

  const isHighMode = currentRisk.mode === 'HIGH';
  const winsToHigh = currentRisk.mode === 'LOW'
    ? Math.max(strategy.winsToRecover - currentRisk.lowWinsProgress, 0)
    : 0;
  const lossesToLow = currentRisk.mode === 'HIGH'
    ? Math.max(strategy.lossesToDrop, 0)
    : 0;

  return (
    <Page title="Dashboard" subtitle="Risk enforcement, exposure clarity, and performance intelligence">
      <Section className="mb-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card
            glow={isHighMode ? 'high' : 'low'}
            className={cn(
              'xl:col-span-2 relative overflow-hidden',
              isHighMode
                ? 'border-emerald-500/30'
                : 'border-amber-400/30'
            )}
          >
            <div
              className={cn(
                'absolute inset-0 opacity-70 transition-all duration-500',
                isHighMode
                  ? 'bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.35),_transparent_55%)]'
                  : 'bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.3),_transparent_55%)]'
              )}
            />
            <div className="relative flex flex-col gap-6">
              {hasData ? (
                <>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          'h-14 w-14 rounded-2xl border flex items-center justify-center',
                          isHighMode
                            ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                            : 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                        )}
                      >
                        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Today’s Risk Budget</p>
                        <h2 className="text-3xl sm:text-4xl font-semibold text-white">{formatPercent(currentRisk.todayRiskPct)}</h2>
                        <p className="text-xs text-ink-muted">As of {currentRisk.asOfDate}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-start sm:items-end gap-2">
                      <ModeBadge mode={currentRisk.mode} size="lg" />
                      <p className="text-sm text-ink-muted">Allowed risk: {formatMoney(currentRisk.allowedRiskDollars)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">Account equity</p>
                      <p className="mt-2 text-xl font-semibold text-white" style={{ fontFeatureSettings: '"tnum"' }}>
                        {formatMoney(currentRisk.equity)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">Active exposure</p>
                      <p className="mt-2 text-xl font-semibold text-white" style={{ fontFeatureSettings: '"tnum"' }}>
                        {formatMoney(totalExposure)}
                      </p>
                      <p className="text-xs text-ink-muted">{activeTrades.length} open trade(s)</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">Rule enforcement</p>
                      <p className="mt-2 text-sm text-white">
                        {isHighMode
                          ? `${lossesToLow} loss to drop to LOW`
                          : `${winsToHigh} wins to recover HIGH`}
                      </p>
                      <p className="text-xs text-ink-muted">
                        Next mode: {isHighMode ? currentRisk.forecast.ifLoss.mode : currentRisk.forecast.ifWin.mode}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-200">If win</p>
                      <p className="mt-2 text-sm font-semibold text-emerald-100">
                        {currentRisk.forecast.ifWin.mode} @ {formatPercent(currentRisk.forecast.ifWin.riskPct)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-red-200">If loss</p>
                      <p className="mt-2 text-sm font-semibold text-red-100">
                        {currentRisk.forecast.ifLoss.mode} @ {formatPercent(currentRisk.forecast.ifLoss.riskPct)}
                      </p>
                    </div>
                  </div>

                  <details className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <summary className="cursor-pointer text-sm font-medium text-white">Explain today’s mode</summary>
                    <div className="mt-3 space-y-2 text-sm text-ink-muted">
                      <p>Mode: {currentRisk.mode} based on Restart strategy sequencing.</p>
                      <p>Low-mode progress: {currentRisk.lowWinsProgress}/{currentRisk.lowWinsNeeded} wins recovered.</p>
                      <p>Forecast: {winsToHigh} wins or {lossesToLow} losses until the next mode transition.</p>
                    </div>
                  </details>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-sky-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">No trade data yet</h3>
                  <p className="text-sm text-ink-muted mb-4">
                    Import a Webull CSV to calculate today’s risk budget and mode.
                  </p>
                  <Button onClick={() => (window.location.href = '/upload')}>Import Trades</Button>
                </div>
              )}
            </div>
          </Card>

          <Card className="flex flex-col gap-5">
            <div>
              <h3 className="text-lg font-semibold text-white">Strategy controls</h3>
              <p className="text-xs text-ink-muted">Restart ruleset snapshot</p>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-muted">HIGH Mode</span>
                <span className="text-emerald-300 font-medium">{formatPercent(strategy.highModeRiskPct)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">LOW Mode</span>
                <span className="text-amber-300 font-medium">{formatPercent(strategy.lowModeRiskPct)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Wins to Recover</span>
                <span className="text-white font-medium">{strategy.winsToRecover}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Losses to Drop</span>
                <span className="text-white font-medium">{strategy.lossesToDrop}</span>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Data confidence</p>
              <p className="mt-2 text-sm text-white">{diagnostics.label}</p>
              <p className="text-xs text-ink-muted">{diagnostics.detail}</p>
            </div>
          </Card>
        </div>
      </Section>

      <Section className="mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">What to watch today</h3>
                <p className="text-xs text-ink-muted">Scanner cues for disciplined entries</p>
              </div>
              <Badge variant={hasData ? 'info' : 'neutral'} size="sm">
                {hasData ? `${watchItems.length} signals` : 'Offline'}
              </Badge>
            </div>
            <div className="space-y-3">
              {watchItems.map((item) => (
                <div
                  key={item.title}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="text-xs text-ink-muted">{item.detail}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.meta && <span className="text-xs text-ink-muted">{item.meta}</span>}
                    <Badge
                      variant={
                        item.status === 'on-track' ? 'success' : item.status === 'risk' ? 'warning' : 'neutral'
                      }
                      size="sm"
                    >
                      {item.status === 'on-track' ? 'On Track' : item.status === 'risk' ? 'At Risk' : 'Monitor'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Performance summary</h3>
                <p className="text-xs text-ink-muted">Last import snapshot</p>
              </div>
              <Badge variant={hasData ? 'success' : 'neutral'} size="sm">
                {hasData ? 'Active' : 'Empty'}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <KPIItem label="Win rate" value={formatPercent(metrics.winRate)} trend={metrics.winRate >= 0.5 ? 'up' : 'down'} />
              <KPIItem label="Avg win" value={formatMoney(metrics.avgWin)} trend="up" />
              <KPIItem label="Avg loss" value={formatMoney(metrics.avgLoss)} trend="down" />
              <KPIItem label="Max drawdown" value={formatPercent(metrics.maxDrawdownPct, 1)} trend="down" />
            </div>
            <details className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">
                More metrics
              </summary>
              <div className="mt-3 space-y-2 text-sm text-ink-muted">
                <p>Total trades: {metrics.totalTrades}</p>
                <p>Profit factor: {metrics.profitFactor.toFixed(2)}</p>
                <p>Streak: {metrics.currentStreak}{metrics.streakType === 'WIN' ? 'W' : metrics.streakType === 'LOSS' ? 'L' : ''}</p>
              </div>
            </details>
          </Card>
        </div>
      </Section>

      <Section className="mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <EquityChart data={dailyEquity} />
          </div>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Diagnostics & integrity</h3>
                <p className="text-xs text-ink-muted">Audit trail and importer health</p>
              </div>
              <Badge variant={diagnostics.status === 'risk' ? 'warning' : diagnostics.status === 'on-track' ? 'success' : 'neutral'} size="sm">
                {diagnostics.status === 'risk' ? 'Review' : diagnostics.status === 'on-track' ? 'Stable' : 'Standby'}
              </Badge>
            </div>
            <div className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <p className="text-sm font-semibold text-white">{diagnostics.label}</p>
                <p className="text-xs text-ink-muted">{diagnostics.detail}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Last import</p>
                <p className="text-sm text-white">
                  {latestImport ? latestImport.fileName : 'No import recorded'}
                </p>
                <p className="text-xs text-ink-muted">
                  {latestImport ? formatDateTime(latestImport.importedAt) : 'Run an import to generate diagnostics.'}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Skipped rows</p>
                <p className="text-sm text-white">
                  {latestImport ? latestImport.stats.duplicatesSkipped : 0} rows skipped
                </p>
                <p className="text-xs text-ink-muted">Duplicates or missing data are flagged for review.</p>
              </div>
            </div>
          </Card>
        </div>
      </Section>

      <Section>
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Active trade visibility</h3>
              <p className="text-xs text-ink-muted">Exposure, stops, and timing for open positions</p>
            </div>
            <Badge variant={activeTrades.length > 0 ? 'info' : 'neutral'} size="sm">
              {activeTrades.length} Active
            </Badge>
          </div>
          {activeTrades.length > 0 ? (
            <div className="space-y-3">
              {activeTrades.slice(0, 6).map((trade) => (
                <div
                  key={trade.id}
                  className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={trade.side === 'LONG' ? 'success' : 'danger'} size="sm">
                      {trade.side}
                    </Badge>
                    <span className="text-lg font-semibold text-white">{trade.symbol}</span>
                    <Badge variant="info" size="sm">Active</Badge>
                  </div>
                  <div>
                    <p className="text-[10px] text-ink-muted uppercase tracking-wider">Entry</p>
                    <p className="text-sm text-white font-medium tabular-nums">{formatMoney(trade.entryPrice)}</p>
                    <p className="text-xs text-ink-muted">{trade.remainingQty.toLocaleString()} shares</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-ink-muted uppercase tracking-wider">Stop</p>
                    <p className="text-sm text-white font-medium tabular-nums">
                      {trade.stopPrice ? formatMoney(trade.stopPrice) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-ink-muted uppercase tracking-wider">Opened</p>
                    <p className="text-sm text-slate-300">{formatDateTime(trade.entryDate)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-ink-muted">
              No active trades right now.
            </div>
          )}
        </Card>
      </Section>
    </Page>
  );
}
