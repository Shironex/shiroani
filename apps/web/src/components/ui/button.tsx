import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Button primitives aligned with the redesign mocks.
 *
 * Mock mapping (shared.css):
 *  - default   → `.btn-accent` (solid primary, rounded-[9px], bold)
 *  - outline   → `.btn-ghost` (glass surface with subtle border)
 *  - icon size → `.btn-icn` (30×30 glass square)
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-[12.5px] font-semibold cursor-pointer transition-[color,background-color,border-color,box-shadow,transform] active:scale-[0.98] focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground font-bold shadow-[0_6px_16px_-6px_oklch(from_var(--primary)_l_c_h/0.5)] hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90',
        outline:
          'border border-border-glass bg-foreground/[0.04] text-foreground hover:bg-foreground/[0.08]',
        secondary: 'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        ghost: 'text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-[14px] py-2',
        sm: 'h-8 rounded-md px-3 text-[11.5px]',
        lg: 'h-10 rounded-lg px-6 text-[13px]',
        icon: 'size-[30px] rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
