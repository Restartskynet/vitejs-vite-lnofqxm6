import { useDashboardState } from '../../stores/dashboardStore';
import { Navigation } from './Navigation';
import { Badge } from '../ui';
import { formatPercent, formatDateTime } from '../../lib/utils';

const LogoIcon = () => (
  <svg className="w-5 h-5 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m0 0l4-4m-4 4l-4-4m9-7.5h.01M6.25 6.5h.01" />
  </svg>
);

export function Header() {
  const { hasData, currentRisk, importHistory } = useDashboardState();
  const latestImport = importHistory[0];

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-slate-950/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-300 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <LogoIcon />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Restart’s Trading Co-Pilot</h1>
              <p className="text-[10px] text-ink-muted uppercase tracking-wider hidden sm:block">Offline risk command center</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-4">
            <Navigation showLabels={false} />
            <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 motion-safe:animate-pulse" />
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
                <span className="text-xl font-bold text-white tabular-nums">{formatPercent(currentRisk.todayRiskPct)}</span>
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
