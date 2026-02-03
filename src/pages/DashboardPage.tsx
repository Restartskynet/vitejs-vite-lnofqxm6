import { useMemo, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../stores/dashboardStore';
import { Page, Section } from '../components/layout';
import { Card, Badge, Button, ModeBadge } from '../components/ui';
import { EquityChart } from '../components/charts';
import { ActiveTradesCard, LastTradesPanel } from '../components/dashboard';
import { formatMoney, formatPercent, cn } from '../lib/utils';

type WatchItem = {
  title: string;
  detail: string;
  status: 'on-track' | 'risk' | 'neutral';
  meta?: string;
};

function KPIItem({
  label,
  value,
  tone = 'neutral',
  style,
}: {
  label: string;
  value: string;
  tone?: 'positive' | 'negative' | 'neutral';
  style?: CSSProperties;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">{label}</p>
      <p
        className={cn(
          'mt-2 text-xl font-semibold',
          tone === 'positive'
            ? 'text-emerald-300'
            : tone === 'negative'
              ? 'text-red-300'
              : 'text-white'
        )}
        style={{ fontFeatureSettings: '"tnum"', ...style }}
      >
        {value}
      </p>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { state } = useDashboard();
  const { currentRisk, metrics, dailyEquity, hasData, isLoading, trades, strategy, settings } = state;
  const activeTrades = trades.filter((trade) => trade.status === 'ACTIVE');

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
          detail: 'Risk budget is ready for the next qualified setup.',
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
      status: trade.stopPrice ? 'on-track' : 'risk',
      meta: trade.stopPrice ? `Stop ${formatMoney(trade.stopPrice)}` : 'Stop not set',
    }));
  }, [activeTrades, hasData]);

  const winsToHigh = currentRisk.mode === 'LOW'
    ? Math.max(strategy.winsToRecover - currentRisk.lowWinsProgress, 0)
    : 0;
  const lossesToLow = Math.max(strategy.lossesToDrop, 0);

  if (isLoading) {
    return (
      <Page title="Restart's Co-Pilot">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      </Page>
    );
  }

  if (!hasData) {
    return (
      <Page title="Restart's Co-Pilot" subtitle="Import trades to activate your daily risk plan.">
        <Card className="border-[rgb(var(--accent-low)/0.45)] bg-white/[0.06]">
          <div className="flex flex-col items-start gap-6">
            <div>
              <p className="text-xl font-semibold font-display text-white">
                Proven risk strategy. Compounding outcomes.
              </p>
              <p className="mt-2 text-sm text-ink-muted">
                Restart’s Trading Co-Pilot applies a disciplined risk model that protects drawdowns and scales winners so your equity curve stays on track.
              </p>
              <ul className="mt-4 text-xs text-ink-muted space-y-1 list-disc list-inside">
                <li>Mode-aware risk sizing based on real trade outcomes.</li>
                <li>Systematic loss control with automatic risk resets.</li>
                <li>Performance snapshots that focus on strategy fidelity.</li>
              </ul>
            </div>
            <div className="relative flex flex-col items-start gap-3 w-full">
              <div className="relative inline-flex flex-col items-start">
                <div className="pointer-events-none flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-ink-muted">
                  <span className="inline-flex h-2 w-2 rounded-full bg-[rgb(var(--accent-low))] opacity-70" />
                  Start here
                </div>
                <div className="mt-2 flex items-center gap-4">
                  <Button
                    size="lg"
                    onClick={() => navigate('/upload')}
                    className="cta-hero w-full sm:w-auto"
                  >
                    Import CSV
                  </Button>
                  <svg
                    className="pointer-events-none h-12 w-12 text-[rgb(var(--accent-low))] opacity-90 cta-arrow-large"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m0 0l4-4m-4 4l4 4" />
                  </svg>
                </div>
              </div>
            </div>
            <p className="text-xs text-ink-muted">
              Designed for a proven risk strategy that compounds equity performance.
            </p>
          </div>
        </Card>
      </Page>
    );
  }

  const isHighMode = currentRisk.mode === 'HIGH';
  const performanceTone = (() => {
    if (metrics.totalTrades === 0) return 'neutral';
    const winLossRatio = metrics.avgLoss > 0 ? metrics.avgWin / metrics.avgLoss : 0;
    if (metrics.totalPnL > 0 && metrics.profitFactor >= 1.2 && winLossRatio >= 1.5) {
      return 'positive';
    }
    if (metrics.totalPnL < 0 || metrics.profitFactor < 1 || winLossRatio < 1) {
      return 'negative';
    }
    return 'neutral';
  })();

  return (
    <Page
      title="Restart’s Co-Pilot"
      subtitle="A risk strategy engine built to protect drawdowns and compound equity."
      action={
        <Button
          onClick={() => navigate('/upload')}
          className={cn(
            'motion-safe:animate-pulse',
            isHighMode
              ? 'shadow-[0_0_28px_rgb(var(--accent-high)/0.4)] border-[rgb(var(--accent-high)/0.7)] bg-[rgb(var(--accent-high))]'
              : 'shadow-[0_0_28px_rgb(var(--accent-low)/0.35)] border-[rgb(var(--accent-low)/0.7)] bg-[rgb(var(--accent-low))]'
          )}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          }
        >
          Import latest CSV
        </Button>
      }
    >
      <Section className="mb-4">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6">
          <div className="space-y-6">
            <Card
              glow={isHighMode ? 'high' : 'low'}
              className={cn(
                'relative overflow-hidden motion-safe:animate-slide-up',
                isHighMode ? 'border-[rgb(var(--accent-high)/0.6)]' : 'border-[rgb(var(--accent-low)/0.6)]'
              )}
            >
              <div
                className={cn(
                  'absolute inset-0 opacity-80 transition-all duration-[var(--motion-duration-slow)] ease-[var(--motion-ease-standard)]',
                  isHighMode
                    ? 'bg-[radial-gradient(circle_at_top,_rgb(var(--accent-high)/0.25),_transparent_60%)]'
                    : 'bg-[radial-gradient(circle_at_top,_rgb(var(--accent-low)/0.2),_transparent_60%)]'
                )}
              />
              <div className="relative flex flex-col gap-6">
                {hasData ? (
                  <>
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            'relative h-20 w-20 rounded-3xl border flex items-center justify-center',
                            isHighMode ? 'neon-glow-high border-[rgb(var(--accent-high)/0.6)]' : 'neon-glow-low border-[rgb(var(--accent-low)/0.6)]'
                          )}
                        >
                          <div className="absolute inset-3 rounded-2xl border border-white/10" />
                          <svg className="relative h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.3em] text-ink-muted">Today’s Risk</p>
                          <div className="flex flex-wrap items-end gap-3">
                            <h2
                              className={cn(
                                'text-4xl sm:text-5xl font-semibold font-display',
                                isHighMode ? 'text-[rgb(var(--accent-high))]' : 'text-[rgb(var(--accent-low))]'
                              )}
                            >
                              {formatPercent(currentRisk.todayRiskPct)}
                            </h2>
                            <ModeBadge mode={currentRisk.mode} size="md" />
                          </div>
                          <p className="text-sm text-ink-muted">Allowed risk: {formatMoney(currentRisk.allowedRiskDollars)}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 min-w-[240px]">
                        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">Account equity</p>
                          <p className="mt-2 text-xl font-semibold text-white" style={{ fontFeatureSettings: '"tnum"' }}>
                            {formatMoney(currentRisk.equity)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">As of</p>
                          <p className="mt-2 text-sm text-white">{currentRisk.asOfDate}</p>
                          <p className="text-xs text-ink-muted">Deterministic snapshot</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">Forecast</p>
                        {isHighMode ? (
                          <div className="mt-2 flex items-center gap-2">
                            <Badge variant="high" size="sm">HIGH active</Badge>
                            <span className="text-xs text-ink-muted">Risk mode is currently HIGH.</span>
                          </div>
                        ) : (
                          <>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <Badge variant="low" size="sm">LOW active</Badge>
                              <span className="text-xs text-ink-muted">Risk mode is currently LOW.</span>
                            </div>
                            <p className="mt-2 text-xs text-ink-muted">
                              {winsToHigh} win{winsToHigh === 1 ? '' : 's'} in LOW → HIGH @ {formatPercent(strategy.highModeRiskPct)}
                            </p>
                          </>
                        )}
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">Forecast</p>
                        <p className="mt-2 text-sm font-semibold text-white">
                          In {lossesToLow} loss{lossesToLow === 1 ? '' : 'es'} → LOW @ {formatPercent(strategy.lowModeRiskPct)}
                        </p>
                        <p className="text-xs text-ink-muted">Losses clamp exposure immediately.</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-sm font-semibold text-white">Risk Disclaimer</p>
                      <p className="text-xs text-ink-muted">
                        Mode transitions are derived from imported trades only. Results vary. Do not take this as financial advice.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[rgb(var(--accent-info)/0.2)] border border-[rgb(var(--accent-info)/0.5)] flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-[rgb(var(--accent-info))]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">First run: activate today’s risk</h3>
                    <p className="text-sm text-ink-muted mb-4 max-w-md">
                      Restart’s Trading Co-Pilot calculates your daily risk mode from your own CSV imports. Start by loading today’s file.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button onClick={() => navigate('/upload')}>
                        Import CSV
                      </Button>
                      <Button variant="secondary" onClick={() => navigate('/upload')}>
                        Explore demo data
                      </Button>
                    </div>
                    <p className="text-xs text-ink-muted mt-4">Local-only. No servers. No auto-imports.</p>
                  </div>
                )}
              </div>
            </Card>

            <ActiveTradesCard
              activeTrades={activeTrades}
              allTrades={trades}
              startingEquity={settings.startingEquity}
              strategy={strategy}
            />
          </div>

          <div className="space-y-6">
            <LastTradesPanel trades={trades} />
          </div>
        </div>
      </Section>

      <Section className="mb-4">
        <div className="grid grid-cols-1 gap-6">
          <EquityChart data={dailyEquity} />
        </div>
      </Section>

      <Section className="mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-6">
          <Card className="motion-safe:animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">What to watch today</h3>
                <p className="text-xs text-ink-muted">Manual cues for focused entries</p>
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

          <Card className="motion-safe:animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Performance summary</h3>
                <p className="text-xs text-ink-muted">Last import snapshot</p>
              </div>
              <Badge
                variant={performanceTone === 'positive' ? 'success' : performanceTone === 'negative' ? 'danger' : 'neutral'}
                size="sm"
              >
                {performanceTone === 'positive' ? 'Strong' : performanceTone === 'negative' ? 'At Risk' : 'Mixed'}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <KPIItem label="Win rate" value={formatPercent(metrics.winRate)} tone={performanceTone} />
              <KPIItem label="Avg win" value={formatMoney(metrics.avgWin)} tone={performanceTone} />
              <KPIItem label="Avg loss" value={formatMoney(metrics.avgLoss)} tone={performanceTone} />
              <KPIItem
                label="Max drawdown"
                value={`↓ ${formatPercent(Math.abs(metrics.maxDrawdownPct), 1)}`}
                tone="neutral"
                style={{ color: 'rgb(var(--accent-danger))' }}
              />
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
    </Page>
  );
}
