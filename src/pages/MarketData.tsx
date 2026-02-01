import { Page, Section } from '../components/layout';
import { Badge, Card, Button } from '../components/ui';
import { cn } from '../lib/utils';

const placeholderBadge = (
  <Badge variant="neutral" size="sm">
    Coming Soon
  </Badge>
);

export function MarketDataPage() {
  return (
    <Page title="Market Data" subtitle="Visual prototypes for live market tooling.">
      <Section className="mb-6">
        <Card className="border border-white/10 bg-white/[0.04]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-ink-muted">Status</p>
              <h2 className="text-xl font-semibold text-white">Market data: Coming soon</h2>
            </div>
            <Badge variant="warning" size="sm">OFFLINE</Badge>
          </div>
        </Card>
      </Section>

      <Section className="mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6">
          <Card className="glass-panel">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Watchlist quotes</h3>
                <p className="text-xs text-ink-muted">Streaming quote grid</p>
              </div>
              {placeholderBadge}
            </div>
            <div className="overflow-hidden rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-ink-muted">
                  <tr>
                    <th className="px-4 py-2 text-left">Symbol</th>
                    <th className="px-4 py-2 text-right">Last</th>
                    <th className="px-4 py-2 text-right">Change</th>
                    <th className="px-4 py-2 text-right">Volume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {['AAPL', 'NVDA', 'TSLA'].map((symbol) => (
                    <tr key={symbol}>
                      <td className="px-4 py-3 text-white font-semibold">{symbol}</td>
                      <td className="px-4 py-3 text-right text-ink-muted">—</td>
                      <td className="px-4 py-3 text-right text-ink-muted">—</td>
                      <td className="px-4 py-3 text-right text-ink-muted">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="glass-panel">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Alerts / signals</h3>
                <p className="text-xs text-ink-muted">Streamed highlights</p>
              </div>
              {placeholderBadge}
            </div>
            <div className="flex flex-wrap gap-2">
              {['Gap scan', 'Momentum', 'VWAP reclaim', 'News spike', 'Breakout'].map((label) => (
                <Badge key={label} variant="info" size="sm">
                  {label}
                </Badge>
              ))}
            </div>
          </Card>
        </div>
      </Section>

      <Section className="mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="glass-panel">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Active positions</h3>
                <p className="text-xs text-ink-muted">Live view tiles</p>
              </div>
              {placeholderBadge}
            </div>
            <div className="space-y-3">
              {[1, 2].map((idx) => (
                <div key={idx} className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-semibold">—</span>
                    <Badge variant="neutral" size="sm">Flat</Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-ink-muted">
                    <span>Qty</span>
                    <span>—</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="glass-panel">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Market pulse</h3>
                <p className="text-xs text-ink-muted">Breadth + internals</p>
              </div>
              {placeholderBadge}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {['Breadth', 'Volatility', 'Leaders', 'Laggers'].map((label) => (
                <div key={label} className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">{label}</p>
                  <p className="mt-2 text-sm text-white">—</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="glass-panel">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Scanner module</h3>
                <p className="text-xs text-ink-muted">Filters + results</p>
              </div>
              {placeholderBadge}
            </div>
            <div className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">Filters</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {['Volume', 'Range', 'Price'].map((filter) => (
                    <Badge key={filter} variant="neutral" size="sm">
                      {filter}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-3 py-6 text-center text-xs text-ink-muted">
                Results queue
              </div>
            </div>
          </Card>
        </div>
      </Section>

      <Section className="mb-6">
        <Card className="glass-panel">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Data source settings</h3>
              <p className="text-xs text-ink-muted">Choose latency mode</p>
            </div>
            {placeholderBadge}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
              { title: '15-min delayed', badge: 'Core plan', helper: 'Included in base access.' },
              { title: 'Real-time', badge: 'Paid add-on', helper: '$19/month · Coming soon.' },
            ].map((option) => (
              <div
                key={option.title}
                className={cn('rounded-xl border border-white/10 bg-white/[0.02] px-4 py-4 flex flex-col gap-3')}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">{option.title}</p>
                  <Badge variant="neutral" size="sm">{option.badge}</Badge>
                </div>
                <p className="text-xs text-ink-muted">{option.helper}</p>
                <div className="flex items-center justify-between">
                  <Button variant="secondary" size="sm" disabled>
                    Select
                  </Button>
                  <Badge variant="warning" size="sm">Coming Soon</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </Section>
    </Page>
  );
}
