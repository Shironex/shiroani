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
        green: 'bg-[oklch(0.78_0.15_140/0.2)] text-[oklch(0.78_0.15_140)]',
        gold: 'bg-[oklch(0.8_0.14_70/0.18)] text-[oklch(0.8_0.14_70)]',
        blue: 'bg-[oklch(0.7_0.15_220/0.2)] text-[oklch(0.7_0.15_220)]',
        orange: 'bg-[oklch(0.74_0.18_40/0.2)] text-[oklch(0.74_0.18_40)]',
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
