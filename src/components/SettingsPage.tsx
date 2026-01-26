import { useDashboard } from '../stores/dashboardStore';
import { Page, Section } from '../components/layout';
import { Card, CardHeader, Button, CurrencyInput, Input, Badge } from '../components/ui';
import { formatPercent } from '../lib/utils';
import { DEFAULT_STRATEGY } from '../types';

export function SettingsPage() {
  const { state, actions } = useDashboard();
  const { settings, adjustments, hasData } = state;
  const strategy = DEFAULT_STRATEGY;

  const handleStartingEquityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      actions.updateSettings({ startingEquity: value });
    }
  };

  const handleStartingDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    actions.updateSettings({ startingDate: e.target.value });
  };

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      actions.clearData();
    }
  };

  return (
    <Page
      title="Settings"
      subtitle="Configure your account and preferences"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Settings */}
        <Card>
          <h3 className="text-lg font-semibold text-white mb-4">Account Settings</h3>
          <div className="space-y-4">
            <CurrencyInput
              label="Starting Equity"
              value={settings.startingEquity.toString()}
              onChange={handleStartingEquityChange}
              helper="Your account value before the first imported trade"
            />
            <Input
              label="Starting Date"
              type="date"
              value={settings.startingDate}
              onChange={handleStartingDateChange}
              helper="Date to begin equity calculations"
            />
          </div>
        </Card>

        {/* Active Strategy */}
        <Card>
          <h3 className="text-lg font-semibold text-white mb-4">Active Strategy</h3>
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <span className="text-sm font-medium text-purple-400">Current</span>
            </div>
            <p className="text-xl font-bold text-white">{strategy.name}</p>
            <p className="text-xs text-slate-400 mt-1">
              HIGH: {formatPercent(strategy.highModeRiskPct)} risk • LOW:{' '}
              {formatPercent(strategy.lowModeRiskPct)} risk • {strategy.winsToRecover} wins to
              recover
            </p>
          </div>
          <Button variant="secondary" size="sm" disabled>
            Change Strategy (Coming Soon)
          </Button>
        </Card>

        {/* Manual Adjustments - Placeholder for Step 3 */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Manual Adjustments</h3>
              <p className="text-xs text-slate-500">Deposits, withdrawals, fees, and corrections</p>
            </div>
            <Button variant="secondary" size="sm" disabled>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add
            </Button>
          </div>

          {adjustments.length > 0 ? (
            <div className="space-y-2">
              {adjustments.map((adj) => (
                <div
                  key={adj.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={adj.amount >= 0 ? 'success' : 'danger'} size="sm">
                      {adj.type}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium text-white">
                        ${Math.abs(adj.amount).toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500">
                        {adj.date} {adj.note && `• ${adj.note}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <p className="text-sm">No adjustments yet</p>
              <p className="text-xs mt-1">
                Add deposits, withdrawals, or fees to track account equity (Coming in Step 3)
              </p>
            </div>
          )}
        </Card>

        {/* Data Management */}
        <Card className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-2">Data Management</h3>
          <p className="text-sm text-slate-400 mb-4">
            Your data is stored locally in your browser. It never leaves your device.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" size="sm" disabled>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export Data
            </Button>
            <Button variant="secondary" size="sm" disabled>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Import Backup
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleClearData}
              disabled={!hasData}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              Clear All Data
            </Button>
          </div>
        </Card>
      </div>
    </Page>
  );
}