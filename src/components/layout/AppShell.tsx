import { type ReactNode, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from './Header';
import { MobileNavigation } from './Navigation';
import { cn } from '../../lib/utils';

export function AppShell({ children, className }: { children: ReactNode; className?: string }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedTheme = window.localStorage.getItem('restart-theme');
    const savedGrid = window.localStorage.getItem('restart-grid');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    if (savedGrid === 'on') {
      document.documentElement.setAttribute('data-grid', 'on');
    } else {
      document.documentElement.setAttribute('data-grid', 'off');
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 synthwave-backdrop" />
        <div className="absolute inset-0 synthwave-grid motion-safe:grid-ambient opacity-70" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgb(var(--accent-glow)/0.18),_transparent_60%)]" />
        <div className="absolute -top-40 right-0 h-[26rem] w-[26rem] rounded-full bg-[rgb(var(--accent-high)/0.12)] blur-3xl ambient-orbit" />
        <div className="absolute -bottom-48 left-0 h-[32rem] w-[32rem] rounded-full bg-[rgb(var(--accent-low)/0.12)] blur-3xl ambient-orbit" />
        <div className="absolute inset-0 opacity-[0.08] mix-blend-screen bg-[linear-gradient(transparent_0%,_rgba(255,255,255,0.08)_50%,_transparent_100%)]" />
      </div>
      <Header />
      <main className={cn('max-w-7xl mx-auto w-full min-w-0 px-4 sm:px-6 py-6 sm:py-8 relative pb-32 sm:pb-8 flex-1', className)}>
        {children}
      </main>
      <footer className="border-t border-white/[0.06] mt-12 py-6 hidden sm:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 text-sm text-ink-muted">
            <div>
              <p className="text-white font-semibold">Restart’s Trading Co-Pilot</p>
              <p className="text-xs text-ink-muted">Local-first • Deterministic • Audit-ready</p>
            </div>
            <div className="flex flex-col items-start lg:items-end gap-1 text-xs text-ink-muted">
              <p>Restart’s Trading Co-Pilot reinforces risk process. Not financial advice.</p>
              <Link to="/legal" className="text-xs text-ink-muted hover:text-white transition-colors">
                Legal &amp; Data Disclaimer
              </Link>
            </div>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
          {title && (
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-white font-display break-words">{title}</h1>
              {subtitle && <p className="text-sm text-ink-muted mt-1 break-words">{subtitle}</p>}
            </div>
          )}
          {action && <div className="sm:shrink-0">{action}</div>}
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
        <div className="flex items-center justify-between min-w-0 gap-3">
          {title && (
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-white font-display break-words">{title}</h2>
              {subtitle && <p className="text-xs text-ink-muted mt-0.5 break-words">{subtitle}</p>}
            </div>
          )}
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
