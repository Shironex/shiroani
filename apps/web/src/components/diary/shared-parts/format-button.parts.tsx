import { cn } from '@/lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface IFormatButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}

/**
 * Shared formatting-button primitive for the diary editor surfaces — used by
 * both the Tiptap toolbar and the selection bubble menu. A labelled toggle
 * (`aria-label` + `aria-pressed`) wrapped in a tooltip when a `title` is given.
 */
export function FormatButton({ onClick, isActive, disabled, children, title }: IFormatButtonProps) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={title}
      aria-pressed={isActive}
      className={cn(
        'inline-flex h-7 min-w-7 items-center justify-center rounded-sm px-1.5 font-mono text-[11px]',
        'transition-colors active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isActive
          ? 'bg-primary/15 text-primary'
          : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
        disabled && 'opacity-30 pointer-events-none'
      )}
    >
      {children}
    </button>
  );

  if (!title) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  );
}
