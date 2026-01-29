import { type InputHTMLAttributes, forwardRef, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
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
          <label htmlFor={inputId} className="block text-[10px] font-medium uppercase tracking-wider text-ink-muted mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">{prefix}</span>}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full rounded-xl bg-white/[0.04] border border-white/10 text-white font-medium',
              'placeholder:text-ink-subtle',
              'focus-visible:outline-none focus-visible:border-[rgb(var(--accent-info)/0.7)] focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-info)/0.25)]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-all duration-150',
              sizeClasses[inputSize],
              prefix && 'pl-8',
              suffix && 'pr-8',
              !prefix && 'pl-4',
              !suffix && 'pr-4',
              error && 'border-red-500/60 focus-visible:border-red-500/60 focus-visible:ring-red-500/20',
              className
            )}
            {...props}
          />
          {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted">{suffix}</span>}
        </div>
        {(helper || error) && <p className={cn('mt-1.5 text-xs', error ? 'text-red-300' : 'text-ink-muted')}>{error || helper}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export const CurrencyInput = forwardRef<HTMLInputElement, Omit<InputProps, 'prefix' | 'type'>>((props, ref) => {
  return <Input ref={ref} type="number" prefix={<span className="text-sm">$</span>} step="0.01" min="0" {...props} />;
});

CurrencyInput.displayName = 'CurrencyInput';

interface SearchInputProps extends Omit<InputProps, 'prefix'> {
  onClear?: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onClear, value, className, ...props }, ref) => {
    return (
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <Input ref={ref} type="search" value={value} className={cn('pl-10', className)} {...props} />
        {value && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 text-ink-muted hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
