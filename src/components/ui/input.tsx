import * as React from "react";
import { cn } from "../../lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm " +
            "outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
