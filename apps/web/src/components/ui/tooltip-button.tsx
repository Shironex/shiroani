import * as React from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface TooltipButtonProps extends ButtonProps {
  tooltip: React.ReactNode;
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right';
}

const TooltipButton = React.forwardRef<HTMLButtonElement, TooltipButtonProps>(
  ({ tooltip, tooltipSide, children, 'aria-label': ariaLabel, ...buttonProps }, ref) => {
    // A tooltip is only wired as `aria-describedby`, not the accessible NAME, so
    // an icon-only TooltipButton would announce as just "button". Derive the
    // name from the string tooltip when the caller hasn't supplied an explicit
    // aria-label — covers every icon-only TooltipButton in one place.
    const accessibleName = ariaLabel ?? (typeof tooltip === 'string' ? tooltip : undefined);
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button ref={ref} aria-label={accessibleName} {...buttonProps}>
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent side={tooltipSide}>{tooltip}</TooltipContent>
      </Tooltip>
    );
  }
);
TooltipButton.displayName = 'TooltipButton';

export { TooltipButton };
export type { TooltipButtonProps };
