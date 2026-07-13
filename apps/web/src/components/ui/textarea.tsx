import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Redesigned textarea primitive — the multi-line sibling of `input.tsx`.
 * Shares the same glass surface (4% foreground tint), subtle border, and
 * primary focus ring so multi-line fields match single-line inputs.
 */
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        'flex min-h-[60px] w-full min-w-0 resize-none rounded-md border border-border-glass bg-foreground/[0.04] px-3 py-2 text-[12.5px] text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-hidden focus-visible:border-primary/60 focus-visible:bg-foreground/[0.06] focus-visible:ring-1 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
