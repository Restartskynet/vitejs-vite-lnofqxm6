import { useState, useMemo } from 'react';
import { useDashboardState } from '../../stores/dashboardStore';
import { Card, CardHeader, CurrencyInput } from '../ui';
import { formatMoney, cn } from '../../lib/utils';

// Calculator icon
const CalculatorIcon = () => (
  <div className="w-11 h-11 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
    <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z"
      />
    </svg>
  </div>
);

// Warning icon
const WarningIcon = () => (
  <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
    />
  </svg>
);

interface PositionSizerProps {
  className?: string;
}

interface CalculationResult {
  maxShares: number;
  riskPerShare: number;
  positionValue: number;
  percentOfAccount: number;
}

interface CalculationError {
  message: string;
  type: 'warning' | 'error';
}

export function PositionSizer({ className }: PositionSizerProps) {
  const { currentRisk, hasData, settings } = useDashboardState();
  const [entry, setEntry] = useState('');
  const [stop, setStop] = useState('');

  const allowedRisk = hasData
    ? currentRisk.allowedRiskDollars
    : settings.startingEquity * 0.03; // Default 3% of starting equity

  const equity = hasData
    ? currentRisk.equity
    : settings.startingEquity;

  const calculation = useMemo((): CalculationResult | CalculationError | null => {
    const entryPrice = parseFloat(entry);
    const stopPrice = parseFloat(stop);

    if (isNaN(entryPrice) || isNaN(stopPrice) || entryPrice <= 0 || stopPrice <= 0) {
      return null;
    }

    const riskPerShare = Math.abs(entryPrice - stopPrice);

    // Validation: Stop too tight
    if (riskPerShare < 0.01) {
      return {
        message: 'Stop too tight (< $0.01 per share)',
        type: 'error',
      };
    }

    // Validation: Stop too wide (more than 50% of entry price)
    if (riskPerShare > entryPrice * 0.5) {
      return {
        message: 'Stop too wide (> 50% of entry price)',
        type: 'warning',
      };
    }

    const maxShares = Math.floor(allowedRisk / riskPerShare);
    const positionValue = maxShares * entryPrice;
    const percentOfAccount = (positionValue / equity) * 100;

    // Validation: Position too large
    if (percentOfAccount > 400) {
      return {
        message: `Position too large (${percentOfAccount.toFixed(0)}% of account)`,
        type: 'warning',
      };
    }

    return {
      maxShares,
      riskPerShare,
      positionValue,
      percentOfAccount,
    };
  }, [entry, stop, allowedRisk, equity]);

  const isError = calculation && 'message' in calculation;
  const result = calculation && !isError ? calculation : null;

  return (
    <Card className={className}>
      <CardHeader
        icon={<CalculatorIcon />}
        title="Position Sizer"
        subtitle={`Max risk: ${formatMoney(allowedRisk)}`}
      />

      <div className="mt-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <CurrencyInput
            label="Entry"
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            placeholder="0.00"
          />
          <CurrencyInput
            label="Stop"
            value={stop}
            onChange={(e) => setStop(e.target.value)}
            placeholder="0.00"
          />
        </div>

        {/* Error state */}
        {isError && (
          <div
            className={cn(
              'flex items-start gap-2 p-3 rounded-lg',
              calculation.type === 'error'
                ? 'bg-red-500/10 border border-red-500/30'
                : 'bg-amber-500/10 border border-amber-500/30'
            )}
          >
            <WarningIcon />
            <p
              className={cn(
                'text-sm',
                calculation.type === 'error' ? 'text-red-400' : 'text-amber-400'
              )}
            >
              {calculation.message}
            </p>
          </div>
        )}

        {/* Result state */}
        {result && (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <p className="text-[10px] text-emerald-400/80 uppercase tracking-wider mb-1">
                Max Shares
              </p>
              <p
                className="text-4xl font-black text-emerald-400 tabular-nums"
                style={{ fontFeatureSettings: '"tnum"' }}
              >
                {result.maxShares.toLocaleString()}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Risk/Share
                </p>
                <p className="text-lg font-semibold text-white tabular-nums">
                  {formatMoney(result.riskPerShare)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Position
                </p>
                <p className="text-lg font-semibold text-white tabular-nums">
                  {formatMoney(result.positionValue, true)}
                </p>
              </div>
            </div>
            {/* Account percentage indicator */}
            <div className="text-xs text-slate-500 text-center">
              {result.percentOfAccount.toFixed(0)}% of account
            </div>
          </div>
        )}

        {/* Empty state */}
        {!calculation && (
          <div className="text-center py-6 text-slate-500">
            <p className="text-sm">Enter entry and stop prices</p>
          </div>
        )}
      </div>
    </Card>
  );
}