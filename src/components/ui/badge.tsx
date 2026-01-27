import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';

// FIX: Add 'default' as an alias for 'neutral' for backwards compatibility
type BadgeVariant = 'high' | 'low' | 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'default';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  pulse?: boolean;
  className?: string;
}

// Core variant classes (without 'default' - it maps to 'neutral')
const coreVariantClasses: Record<Exclude<BadgeVariant, 'default'>, string> = {
  high: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  low: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  danger: 'bg-red-500/15 text-red-400 border-red-500/30',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  info: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  neutral: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

// Helper to get variant class (maps 'default' to 'neutral')
function getVariantClass(variant: BadgeVariant): string {
  const effectiveVariant = variant === 'default' ? 'neutral' : variant;
  return coreVariantClasses[effectiveVariant];
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'text-[10px] px-2 py-0.5 gap-1',
  md: 'text-xs px-3 py-1 gap-1.5',
  lg: 'text-sm px-4 py-1.5 gap-2',
};

// Core pulse colors (without 'default')
const corePulseColors: Record<Exclude<BadgeVariant, 'default'>, string> = {
  high: 'bg-emerald-400',
  low: 'bg-amber-400',
  success: 'bg-emerald-400',
  danger: 'bg-red-400',
  warning: 'bg-amber-400',
  info: 'bg-blue-400',
  neutral: 'bg-slate-400',
};

// Helper to get pulse color (maps 'default' to 'neutral')
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
      {pulse && <span className={cn('h-1.5 w-1.5 rounded-full animate-pulse', getPulseColor(variant))} />}
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

// Export the variant type for use elsewhere
export type { BadgeVariant, BadgeSize };