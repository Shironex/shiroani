import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Badge primitive — `.pill` / `.pill.on` from the redesign mocks.
 *
 * Rounded-full, small padding, subtle border. For mono-uppercase tag chips
 * (e.g. "LIVE", "S1:E04") prefer `PillTag` in @/components/ui/pill-tag.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-[5px] rounded-full border px-[10px] py-[4px] text-[11.5px] font-medium leading-none transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-primary/40 bg-primary/18 text-primary font-semibold hover:bg-primary/25',
        secondary:
          'border-border-glass bg-foreground/[0.05] text-muted-foreground hover:bg-foreground/[0.08]',
        destructive:
          'border-transparent bg-destructive/20 text-destructive hover:bg-destructive/30',
        outline: 'border-border text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };
