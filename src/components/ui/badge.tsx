import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';

type BadgeVariant = 'high' | 'low' | 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'default';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  pulse?: boolean;
  className?: string;
}

const coreVariantClasses: Record<Exclude<BadgeVariant, 'default'>, string> = {
  high: 'bg-[rgb(var(--accent-high)/0.16)] text-[rgb(var(--accent-high))] border-[rgb(var(--accent-high)/0.4)]',
  low: 'bg-[rgb(var(--accent-low)/0.16)] text-[rgb(var(--accent-low))] border-[rgb(var(--accent-low)/0.4)]',
  success: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40',
  danger: 'bg-red-500/15 text-red-300 border-red-400/40',
  warning: 'bg-amber-500/15 text-amber-300 border-amber-400/40',
  info: 'bg-[rgb(var(--accent-info)/0.16)] text-[rgb(var(--accent-info))] border-[rgb(var(--accent-info)/0.4)]',
  neutral: 'bg-white/5 text-ink-muted border-border/60',
};

function getVariantClass(variant: BadgeVariant): string {
  const effectiveVariant = variant === 'default' ? 'neutral' : variant;
  return coreVariantClasses[effectiveVariant];
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'text-[10px] px-2 py-0.5 gap-1',
  md: 'text-xs px-3 py-1 gap-1.5',
  lg: 'text-sm px-4 py-1.5 gap-2',
};

const corePulseColors: Record<Exclude<BadgeVariant, 'default'>, string> = {
  high: 'bg-[rgb(var(--accent-high))]',
  low: 'bg-[rgb(var(--accent-low))]',
  success: 'bg-emerald-300',
  danger: 'bg-red-300',
  warning: 'bg-amber-300',
  info: 'bg-[rgb(var(--accent-info))]',
  neutral: 'bg-slate-400',
};

function getPulseColor(variant: BadgeVariant): string {
  const effectiveVariant = variant === 'default' ? 'neutral' : variant;
  return corePulseColors[effectiveVariant];
}

export function Badge({ children, variant = 'neutral', size = 'md', pulse = false, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-semibold uppercase tracking-wider',
        getVariantClass(variant),
        sizeClasses[size],
        className
      )}
    >
      {pulse && <span className={cn('h-1.5 w-1.5 rounded-full motion-safe:animate-pulse', getPulseColor(variant))} />}
      {children}
    </span>
  );
}

export function ModeBadge({ mode, size = 'lg' }: { mode: 'HIGH' | 'LOW'; size?: BadgeSize }) {
  return (
    <Badge variant={mode === 'HIGH' ? 'high' : 'low'} size={size} pulse>
      {mode} Mode
    </Badge>
  );
}

export type { BadgeVariant, BadgeSize };
