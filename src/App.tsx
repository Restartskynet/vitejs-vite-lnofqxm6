import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardProvider } from './stores/dashboardStore';
import { AuthProvider } from './stores/authStore';
import { SyncProvider } from './stores/syncStore';
import { AppShell } from './components/layout';
import { DashboardPage, MarketDataPage, UploadPage, TradesPage, SettingsPage, LegalPage, AuthPage } from './pages';
import { AppErrorBoundary } from './components/AppErrorBoundary';

function App() {
  return (
    <AuthProvider>
      <DashboardProvider>
        <SyncProvider>
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
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AppShell>
            </AppErrorBoundary>
          </BrowserRouter>
        </SyncProvider>
      </DashboardProvider>
    </AuthProvider>
  );
}

export default App;
