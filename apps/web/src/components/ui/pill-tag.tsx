import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Mock primitive: `.pill-tag` from the redesign's shared.css.
 * Small mono-spaced uppercase tag used for status/genre/score chips across
 * Library, News, Schedule, and Diary.
 */
const pillTagVariants = cva(
  'inline-flex items-center px-2 py-[3px] rounded-[4px] font-mono text-[10px] font-semibold uppercase tracking-[0.04em] leading-none',
  {
    variants: {
      variant: {
        accent: 'bg-primary/15 text-primary',
        muted: 'bg-foreground/5 text-muted-foreground',
        green: 'bg-status-success-bg text-status-success',
        gold: 'bg-(--gold-bg) text-(--gold)',
        blue: 'bg-status-info-bg text-status-info',
        orange: 'bg-status-pending-bg text-status-pending',
        destructive: 'bg-destructive/15 text-destructive',
      },
    },
    defaultVariants: {
      variant: 'muted',
    },
  }
);

export interface PillTagProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof pillTagVariants> {}

export function PillTag({ className, variant, ...props }: PillTagProps) {
  return <span className={cn(pillTagVariants({ variant, className }))} {...props} />;
}

export { pillTagVariants };
