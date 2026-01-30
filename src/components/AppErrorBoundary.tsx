import React, { type ReactNode, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, Button } from './ui';
import { useDashboard } from '../stores/dashboardStore';

type ErrorBoundaryProps = {
  routePath: string;
  onReset: () => Promise<void> | void;
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App crash captured by ErrorBoundary', {
      route: this.props.routePath,
      error: error.message,
      stack: info.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onReset={this.props.onReset} />;
    }

    return this.props.children;
  }
}

function ErrorFallback({ onReset }: { onReset: () => Promise<void> | void }) {
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await onReset();
    } finally {
      window.location.reload();
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="max-w-lg text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
          <svg className="h-6 w-6 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75l8.954-7.745a1.125 1.125 0 011.584 0l8.954 7.745M3 10.5v8.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V10.5" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Something went wrong</h2>
          <p className="text-sm text-ink-muted mt-1">
            The app hit an unexpected error. Reload to try again, or reset app state if the issue persists.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="secondary" onClick={() => window.location.reload()} className="flex-1">
            Reload
          </Button>
          <Button variant="danger" onClick={handleReset} loading={isResetting} className="flex-1">
            Reset App State
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function AppErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { actions } = useDashboard();

  return (
    <ErrorBoundary routePath={location.pathname} onReset={actions.clearData}>
      {children}
    </ErrorBoundary>
  );
}
