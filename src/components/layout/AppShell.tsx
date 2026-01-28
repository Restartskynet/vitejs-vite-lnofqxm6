import { type ReactNode } from 'react';
import { Header } from './Header';
import { MobileNavigation } from './Navigation';
import { cn } from '../../lib/utils';

export function AppShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.18),_transparent_45%),radial-gradient(circle_at_25%_20%,_rgba(56,189,248,0.12),_transparent_40%),radial-gradient(circle_at_80%_0%,_rgba(16,185,129,0.12),_transparent_40%)] opacity-90" />
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl ambient-orbit" />
        <div className="absolute -bottom-40 -left-40 h-[30rem] w-[30rem] rounded-full bg-emerald-500/10 blur-3xl ambient-orbit" />
      </div>
      <Header />
      <main className={cn('max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 relative pb-24 sm:pb-8', className)}>
        {children}
      </main>
      <footer className="border-t border-white/[0.06] mt-12 py-6 hidden sm:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 text-sm text-ink-muted">
            <div>
              <p className="text-white font-semibold">Restart’s Trading Co-Pilot</p>
              <p className="text-xs text-ink-muted">Local-first • Deterministic • Audit-ready</p>
            </div>
            <p className="text-xs text-ink-muted">Restart’s Trading Co-Pilot is a rule-enforcement tool. Not financial advice.</p>
          </div>
        </div>
      </footer>
      <MobileNavigation />
    </div>
  );
}

export function Page({ title, subtitle, action, children, className }: { title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-6 motion-safe:animate-fade-in', className)}>
      {(title || action) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {title && (
            <div>
              <h1 className="text-2xl font-bold text-white">{title}</h1>
              {subtitle && <p className="text-sm text-ink-muted mt-1">{subtitle}</p>}
            </div>
          )}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function Section({ title, subtitle, action, children, className }: { title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('space-y-4', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between">
          {title && (
            <div>
              <h2 className="text-lg font-semibold text-white">{title}</h2>
              {subtitle && <p className="text-xs text-ink-muted mt-0.5">{subtitle}</p>}
            </div>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
