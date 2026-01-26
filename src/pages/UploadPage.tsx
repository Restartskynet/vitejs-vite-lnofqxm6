import { Page, Section } from '../components/layout';
import { Card } from '../components/ui';

export function UploadPage() {
  return (
    <Page title="Import Trades" subtitle="Upload your Webull Orders CSV to calculate risk">
      <Section>
        <Card>
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center mx-auto mb-5">
              <svg className="w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Upload Module Coming in Step 2</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">This will include drag & drop upload, CSV validation, preview table, and real integration with the Webull Orders importer.</p>
          </div>
        </Card>
      </Section>

      <Section title="How to Export from Webull">
        <Card>
          <div className="space-y-4 text-sm text-slate-400">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 text-blue-400 text-xs font-bold">1</div>
              <p>Open the Webull app or website and go to your account</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 text-blue-400 text-xs font-bold">2</div>
              <p>Navigate to <strong className="text-white">Orders</strong> → <strong className="text-white">Order History</strong></p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 text-blue-400 text-xs font-bold">3</div>
              <p>Click the <strong className="text-white">Export</strong> button and select CSV format</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 text-blue-400 text-xs font-bold">4</div>
              <p>Upload the downloaded file here</p>
            </div>
          </div>
        </Card>
      </Section>
    </Page>
  );
}