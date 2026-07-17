import { cn } from '@/lib/utils';
import { selectableChip } from '@/components/settings/chip-styles';
import { useSelectableChipButton } from './SelectableChipButton.hooks';
import type { ISelectableChipButtonProps } from './SelectableChipButton.types';

/**
 * The shared "selectable chip" button — the segmented pill used across settings
 * (channel picker, font-scale buttons, language picker). Captures the common
 * recipe (rounded pill, transition, active:scale, focus ring, selected-state
 * coloring, `aria-pressed`, `font-semibold` when active) so callers supply only
 * their own padding, text size and any layout extras through `className`.
 */
export default function SelectableChipButton({
  active,
  disabled,
  onClick,
  className,
  children,
}: ISelectableChipButtonProps) {
  useSelectableChipButton();

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        'rounded-lg border px-3 font-medium',
        'transition-[color,background-color,border-color,transform] active:scale-[0.98]',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        selectableChip(active),
        active && 'font-semibold',
        className
      )}
    >
      {children}
    </button>
  );
}
