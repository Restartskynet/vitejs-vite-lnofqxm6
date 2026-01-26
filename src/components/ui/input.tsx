import { type InputHTMLAttributes, forwardRef, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helper?: string;
  error?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  inputSize?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-9 text-sm',
  md: 'h-12 text-base',
  lg: 'h-14 text-lg',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helper, error, prefix, suffix, inputSize = 'md', className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{prefix}</span>}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full rounded-xl bg-white/[0.05] border border-white/10 text-white font-medium',
              'placeholder:text-slate-600',
              'focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-all duration-150',
              sizeClasses[inputSize],
              prefix && 'pl-8',
              suffix && 'pr-8',
              !prefix && 'pl-4',
              !suffix && 'pr-4',
              error && 'border-red-500/60 focus:border-red-500/60 focus:ring-red-500/20',
              className
            )}
            {...props}
          />
          {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">{suffix}</span>}
        </div>
        {(helper || error) && <p className={cn('mt-1.5 text-xs', error ? 'text-red-400' : 'text-slate-500')}>{error || helper}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export const CurrencyInput = forwardRef<HTMLInputElement, Omit<InputProps, 'prefix' | 'type'>>(
  ({ ...props }, ref) => {
    return <Input ref={ref} type="number" prefix={<span className="text-sm">$</span>} step="0.01" min="0" {...props} />;
  }
);

CurrencyInput.displayName = 'CurrencyInput';