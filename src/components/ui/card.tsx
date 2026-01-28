import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  glow?: 'high' | 'low' | 'info' | 'none';
  noPadding?: boolean;
}

export function Card({ children, className, glow = 'none', noPadding = false }: CardProps) {
  const glowClasses = {
    high: 'shadow-glow-high',
    low: 'shadow-glow-low',
    info: 'shadow-[0_0_50px_rgba(56,189,248,0.2)]',
    none: 'shadow-card-soft',
  };

  return (
    <div
      className={cn(
        'rounded-2xl border border-border/60 bg-surface/80 backdrop-blur-xl',
        'transition-all duration-300',
        glowClasses[glow],
        !noPadding && 'p-5 sm:p-6',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  icon,
  title,
  subtitle,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {subtitle && <p className="text-xs text-ink-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function CardContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mt-5', className)}>{children}</div>;
}
