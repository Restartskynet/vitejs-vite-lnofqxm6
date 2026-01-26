import { useDashboardState } from '../../stores/dashboardStore';
import { Card, CardHeader, Badge } from '../ui';
import { formatPercent, cn } from '../../lib/utils';
import { DEFAULT_STRATEGY } from '../../types';

const ShieldIcon = () => (
  <div className="w-11 h-11 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
    <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  </div>
);

export function StrategyExplainer({ className, collapsed = false }: { className?: string; collapsed?: boolean }) {
  const { currentRisk, hasData } = useDashboardState();
  const mode = hasData ? currentRisk.mode : 'HIGH';
  const strategy = DEFAULT_STRATEGY;

  if (collapsed) {
    return (
      <Card className={className}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldIcon />
            <div>
              <h3 className="font-semibold text-white">{strategy.name}</h3>
              <p className="text-xs text-slate-500">HIGH: {formatPercent(strategy.highModeRiskPct)} • LOW: {formatPercent(strategy.lowModeRiskPct)} • {strategy.winsToRecover} wins to recover</p>
            </div>
          </div>
          <Badge variant={mode === 'HIGH' ? 'high' : 'low'} size="md" pulse>{mode}</Badge>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader icon={<ShieldIcon />} title={strategy.name} subtitle="Adaptive risk management" />
      <div className="mt-5 grid grid-cols-2 gap-4">
        <div className={cn('p-4 rounded-xl border transition-all', mode === 'HIGH' ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-white/[0.02] border-white/[0.06]')}>
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="high" size="sm">HIGH</Badge>
            {mode === 'HIGH' && <span className="text-xs text-emerald-400">Active</span>}
          </div>
          <ul className="space-y-2 text-sm text-slate-400">
            <li>• Risk {formatPercent(strategy.highModeRiskPct)} per trade</li>
            <li>• {strategy.lossesToDrop} loss → LOW mode</li>
            <li>• Wins stay in HIGH</li>
          </ul>
        </div>
        <div className={cn('p-4 rounded-xl border transition-all', mode === 'LOW' ? 'bg-amber-500/10 border-amber-500/40' : 'bg-white/[0.02] border-white/[0.06]')}>
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="low" size="sm">LOW</Badge>
            {mode === 'LOW' && <span className="text-xs text-amber-400">Active</span>}
          </div>
          <ul className="space-y-2 text-sm text-slate-400">
            <li>• Risk {formatPercent(strategy.lowModeRiskPct)} per trade</li>
            <li>• {strategy.winsToRecover} wins → HIGH mode</li>
            <li>• Loss resets progress</li>
          </ul>
        </div>
      </div>
      <div className="mt-5 pt-5 border-t border-white/[0.06]">
        <p className="text-xs text-slate-500">
          <strong className="text-slate-400">How it works:</strong> After a losing trade, risk drops to {formatPercent(strategy.lowModeRiskPct)} to protect your capital. Win {strategy.winsToRecover} trades in a row to return to full {formatPercent(strategy.highModeRiskPct)} risk.
        </p>
      </div>
    </Card>
  );
}