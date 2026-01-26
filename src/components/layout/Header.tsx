import { useDashboardState } from '../../stores/dashboardStore';
import { Navigation } from './Navigation';
import { Badge } from '../ui';
import { formatPercent } from '../../lib/utils';

const LogoIcon = () => (
  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);

export function Header() {
  const { hasData, currentRisk } = useDashboardState();

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-slate-950/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <LogoIcon />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Restart Risk</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider hidden sm:block">Strategy Dashboard</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-4">
            <Navigation showLabels={false} />
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