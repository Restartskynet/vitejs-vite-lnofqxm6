import { useDashboardState } from '../stores/dashboardStore';
import { Page } from '../components/layout';
import { Card, Button } from '../components/ui';
import { Link } from 'react-router-dom';

export function TradesPage() {
  const { hasData, trades } = useDashboardState();

  if (!hasData) {
    return (
      <Page title="Trade History" subtitle="Import trades to see detailed history">
        <Card>
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No trades yet</h3>
            <p className="text-sm text-slate-400 mb-6 max-w-sm mx-auto">Import your Webull CSV to see a detailed breakdown of every trade with P&L tracking.</p>
            <Link to="/upload"><Button>Import Trades</Button></Link>
          </div>
        </Card>
      </Page>
    );
  }

  return (
    <Page title="Trade History" subtitle={`${trades.length} trades`} action={<Button variant="secondary" size="sm">Export</Button>}>
      <Card>
        <div className="text-center py-12">
          <p className="text-slate-500">Full trades table with search, sort, and expandable rows coming in Step 2</p>
        </div>
      </Card>
    </Page>
  );
}