import * as React from 'react';
import { cn } from '@/lib/utils';

interface StatLabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  as?: 'span' | 'p';
}

/**
 * Canonical caption used under stat values (and wherever the redesign uses the
 * "font-mono 10px tracked uppercase" label style). Kept as a tiny primitive so
 * callers can reuse the exact token without re-typing it.
 */
export function StatLabel({ as = 'span', className, children, ...props }: StatLabelProps) {
  const Tag = as;
  return (
    <Tag
      className={cn(
        'font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground',
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
