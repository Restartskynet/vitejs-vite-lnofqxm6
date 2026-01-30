import { useDashboardState } from '../../stores/dashboardStore';
import { Navigation } from './Navigation';
import { Badge } from '../ui';
import { formatPercent, formatDateTime, cn } from '../../lib/utils';

const LogoIcon = () => (
  <svg className="w-6 h-6 text-[rgb(var(--accent-high))]" fill="none" viewBox="0 0 32 32" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 4.5a11.5 11.5 0 1011.5 11.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 4.5c4.5 2.6 7.5 7 7.5 11.5S20.5 24.9 16 27.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 16h23" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 4.5c-3.2 2.1-5.5 6.5-5.5 11.5S12.8 25.9 16 27.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M22.5 8.5h-13" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M22.5 23.5h-13" />
  </svg>
);

export function Header() {
  const { hasData, currentRisk, importHistory } = useDashboardState();
  const latestImport = importHistory[0];

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-2xl bg-slate-900/80 border border-[rgb(var(--accent-low)/0.4)] flex items-center justify-center shadow-[0_0_24px_rgb(var(--accent-high)/0.2)] logo-glow">
              <span className="pointer-events-none absolute inset-0 rounded-2xl logo-shimmer" />
              <LogoIcon />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight font-display">Restart's Co-Pilot</h1>
              <p className="text-[10px] text-ink-muted uppercase tracking-wider hidden sm:block">
                Restart’s Trading Dashboard
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-4">
            <Navigation showLabels={false} />
            <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent-low))] motion-safe:animate-pulse" />
              Saved locally
            </div>
            {latestImport && (
              <span className="text-[10px] text-ink-muted">
                Last import {formatDateTime(latestImport.importedAt)}
              </span>
            )}
            {hasData && (
              <div className="flex items-center gap-3 pl-4 border-l border-white/[0.08]">
                <Badge variant={currentRisk.mode === 'HIGH' ? 'high' : 'low'} size="md" pulse>
                  {currentRisk.mode}
                </Badge>
                <span
                  className={cn(
                    'text-xl font-bold tabular-nums',
                    currentRisk.mode === 'HIGH'
                      ? 'text-[rgb(var(--accent-high))]'
                      : 'text-[rgb(var(--accent-low))]'
                  )}
                >
                  {formatPercent(currentRisk.todayRiskPct)}
                </span>
              </div>
            )}
          </div>

          <div className="sm:hidden">
            {hasData && (
              <Badge variant={currentRisk.mode === 'HIGH' ? 'high' : 'low'} size="sm" pulse>
                {currentRisk.mode}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
