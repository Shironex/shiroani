import { cn } from '@/lib/utils';

interface IToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}

export function ToolbarButton({
  onClick,
  isActive,
  disabled,
  children,
  title,
}: IToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={isActive}
      className={cn(
        'inline-flex h-7 min-w-7 items-center justify-center rounded-[5px] px-1.5 font-mono text-[11px]',
        'transition-colors',
        isActive
          ? 'bg-primary/15 text-primary'
          : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
        disabled && 'opacity-30 pointer-events-none'
      )}
    >
      {children}
    </button>
  );
}

export function ToolbarDivider() {
  return <div aria-hidden="true" className="mx-1 h-[18px] w-px bg-border-glass" />;
}
