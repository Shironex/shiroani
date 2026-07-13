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
  'inline-flex items-center gap-[5px] rounded-full border px-[10px] py-[4px] text-[11.5px] font-medium leading-none transition-colors',
  {
    variants: {
      variant: {
        default: 'border-primary/40 bg-primary/18 text-primary font-semibold',
        secondary: 'border-border-glass bg-foreground/[0.05] text-muted-foreground',
        destructive: 'border-transparent bg-destructive/20 text-destructive',
        outline: 'border-border text-foreground',
      },
      // Static badges get no hover affordance. Opt into hover feedback (for
      // clickable/toggleable badges) via `interactive`.
      interactive: {
        true: 'cursor-pointer',
        false: '',
      },
    },
    compoundVariants: [
      { variant: 'default', interactive: true, class: 'hover:bg-primary/25' },
      { variant: 'secondary', interactive: true, class: 'hover:bg-foreground/[0.08]' },
      { variant: 'destructive', interactive: true, class: 'hover:bg-destructive/30' },
    ],
    defaultVariants: {
      variant: 'default',
      interactive: false,
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, interactive, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, interactive, className }))} {...props} />;
}

export { Badge, badgeVariants };
