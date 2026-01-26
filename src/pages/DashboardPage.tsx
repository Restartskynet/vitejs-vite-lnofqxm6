import { useDashboardState } from '../stores/dashboardStore';
import { TopSummaryStrip, Section } from '../components/layout';
import { HeroRiskPanel, PositionSizer, StrategyExplainer } from '../components/dashboard';
import { TradesTable } from '../components/trades';
import { Button } from '../components/ui';
import { Link } from 'react-router-dom';

export function DashboardPage() {
  const { hasData, trades } = useDashboardState();

  // Get most recent 5 trades for preview
  const recentTrades = trades.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Hero Row: Risk Panel + Position Sizer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <HeroRiskPanel />
        </div>
        <div>
          <PositionSizer />
        </div>
      </div>

      {/* KPI Strip */}
      <TopSummaryStrip />

      {/* Strategy Explainer */}
      <StrategyExplainer collapsed={hasData} />

      {/* Quick Actions for empty state */}
      {!hasData && (
        <Section title="Get Started">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link to="/upload" className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 hover:border-blue-500/40 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Import Trades</h3>
              <p className="text-sm text-slate-400">Upload your Webull Orders CSV to calculate risk</p>
            </Link>
            <Link to="/settings" className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-white/[0.05] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Configure Settings</h3>
              <p className="text-sm text-slate-400">Set your starting equity and preferences</p>
            </Link>
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="w-12 h-12 rounded-xl bg-white/[0.05] flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Learn More</h3>
              <p className="text-sm text-slate-400">Understand how the Restart Throttle strategy works</p>
            </div>
          </div>
        </Section>
      )}

      {/* Recent Trades Preview (when has data) */}
      {hasData && recentTrades.length > 0 && (
        <Section
          title="Recent Trades"
          action={
            <Link to="/trades">
              <Button variant="ghost" size="sm">
                View All ({trades.length}) →
              </Button>
            </Link>
          }
        >
          <TradesTable trades={recentTrades} />
        </Section>
      )}
    </div>
  );
}