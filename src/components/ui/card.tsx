import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  glow?: 'success' | 'warning' | 'info' | 'none';
  noPadding?: boolean;
  hover?: boolean;
}

export function Card({
  children,
  className,
  glow = 'none',
  noPadding = false,
  hover = false,
}: CardProps) {
  const glowClasses = {
    success: 'shadow-[0_0_60px_rgba(16,185,129,0.12)]',
    warning: 'shadow-[0_0_60px_rgba(245,158,11,0.12)]',
    info: 'shadow-[0_0_60px_rgba(59,130,246,0.12)]',
    none: 'shadow-lg shadow-black/20',
  };

  return (
    <div
      className={cn(
        'rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-sm',
        glowClasses[glow],
        !noPadding && 'p-5',
        hover && 'transition-all duration-200 hover:border-white/20 hover:-translate-y-0.5 hover:shadow-xl',
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({ icon, title, subtitle, action, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn('mt-5', className)}>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={cn('mt-5 pt-5 border-t border-white/[0.06]', className)}>
      {children}
    </div>
  );
}