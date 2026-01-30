import { Page } from '../components/layout';
import { Card } from '../components/ui';

export function LegalPage() {
  return (
    <Page title="Legal & Data Disclaimer" subtitle="Important information about usage, data storage, and responsibility">
      <div className="space-y-6">
        <Card className="space-y-4 text-sm text-ink-muted">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">Not Financial Advice</h2>
            <p>
              Restart’s Trading Co-Pilot provides analytical tooling only. It does not provide investment advice,
              recommendations, or solicitations. You are solely responsible for your trading decisions.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">Local-Only Processing</h2>
            <p>
              All CSV parsing, trade reconstruction, and risk calculations run locally in your browser.
              No trade data is uploaded to a server. Your imports and derived data stay on your device.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">Data Storage & Backups</h2>
            <p>
              The app stores data using your browser’s local storage and IndexedDB. Clearing your browser data,
              using private browsing, or switching devices will remove access to stored imports.
            </p>
            <p>
              You are responsible for exporting backups and safeguarding your files. Use the Backup/Restore
              tools in Settings to keep a copy of your data.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">Accuracy & Verification</h2>
            <p>
              Always verify imports for completeness and accuracy. Missing, malformed, or incorrect broker exports can
              produce misleading results. Review warnings before committing imports.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">Limitation of Liability</h2>
            <p>
              Restart’s Trading Co-Pilot is provided “as is” without warranties of any kind. To the fullest extent
              permitted by law, the authors are not liable for any losses or damages arising from its use.
            </p>
          </section>
        </Card>
      </div>
    </Page>
  );
}
