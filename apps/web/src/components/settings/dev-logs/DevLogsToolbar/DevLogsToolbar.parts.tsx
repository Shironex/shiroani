import { cn } from '@/lib/utils';

interface SourceButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
}

/** One pill in the source selector (Buffer / Today / Archive). */
export function SourceButton({ active, onClick, label }: SourceButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-md px-2.5 py-1 font-medium transition-[color,background-color,transform] active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        active
          ? 'bg-foreground/[0.08] text-foreground'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {label}
    </button>
  );
}
