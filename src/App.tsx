import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardProvider } from './stores/dashboardStore';
import { AppShell } from './components/layout';
import { DashboardPage, MarketDataPage, UploadPage, TradesPage, SettingsPage, LegalPage } from './pages';
import { AppErrorBoundary } from './components/AppErrorBoundary';

function App() {
  return (
    <DashboardProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppErrorBoundary>
          <AppShell>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/trades" element={<TradesPage />} />
              <Route path="/market-data" element={<MarketDataPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/legal" element={<LegalPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppShell>
        </AppErrorBoundary>
      </BrowserRouter>
    </DashboardProvider>
  );
}

export default App;
