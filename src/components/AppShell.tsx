import { type ReactNode } from 'react';
import { Header } from './Header';
import { MobileNavigation } from './Navigation';
import { cn } from '../../lib/utils';

interface AppShellProps {
  children: ReactNode;
  className?: string;
}

export function AppShell({ children, className }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-950/30 via-transparent to-purple-950/20 pointer-events-none" />

      {/* Header */}
      <Header />

      {/* Main content */}
      <main
        className={cn(
          'max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 relative',
          // Add bottom padding for mobile nav
          'pb-24 sm:pb-8',
          className
        )}
      >
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] mt-12 py-6 hidden sm:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <p>Restart's Risk Strategy Dashboard • Deterministic position management</p>
            <p>Local-first • Your data never leaves your device</p>
          </div>
        </div>
      </footer>

      {/* Mobile Navigation */}
      <MobileNavigation />
    </div>
  );
}

// Page wrapper for consistent page styling
interface PageProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Page({ title, subtitle, action, children, className }: PageProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {(title || action) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {title && (
            <div>
              <h1 className="text-2xl font-bold text-white">{title}</h1>
              {subtitle && (
                <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
              )}
            </div>
          )}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

// Section wrapper for consistent section styling
interface SectionProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Section({ title, subtitle, action, children, className }: SectionProps) {
  return (
    <section className={cn('space-y-4', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between">
          {title && (
            <div>
              <h2 className="text-lg font-semibold text-white">{title}</h2>
              {subtitle && (
                <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
              )}
            </div>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}