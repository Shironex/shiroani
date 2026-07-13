import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Redesigned input primitive — `.input` class from shared.css.
 * Glass surface (4% foreground tint) + subtle border, 8px radius.
 */
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full min-w-0 rounded-md border border-border-glass bg-foreground/[0.04] px-3 py-[8px] text-[12.5px] text-foreground placeholder:text-muted-foreground transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:outline-hidden focus-visible:border-primary/60 focus-visible:bg-foreground/[0.06] focus-visible:ring-1 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
