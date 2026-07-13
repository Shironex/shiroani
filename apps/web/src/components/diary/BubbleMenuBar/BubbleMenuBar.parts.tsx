import { cn } from '@/lib/utils';
import type { IBubbleButton } from './BubbleMenuBar.types';

/** A single formatting button in the bubble menu. */
export function BubbleButton({ button }: { button: IBubbleButton }) {
  const { Icon, label, active, toggle } = button;
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={toggle}
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-sm transition-colors active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'bg-primary/15 text-primary'
          : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'
      )}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

/** The inline-mark formatting cluster (bold / italic / strike). */
export function FormattingButtons({ buttons }: { buttons: IBubbleButton[] }) {
  return (
    <>
      {buttons.map(button => (
        <BubbleButton key={button.key} button={button} />
      ))}
    </>
  );
}
