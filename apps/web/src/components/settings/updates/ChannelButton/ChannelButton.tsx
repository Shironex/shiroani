import { cn } from '@/lib/utils';
import { selectableChip } from '@/components/settings/chip-styles';
import { useChannelButton } from './ChannelButton.hooks';
import type { IChannelButtonProps } from './ChannelButton.types';

export default function ChannelButton({
  active,
  disabled,
  onClick,
  children,
}: IChannelButtonProps) {
  useChannelButton();

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-[6px] rounded-lg border text-[12px] font-medium',
        'transition-[color,background-color,border-color,transform] active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        selectableChip(active),
        active && 'font-semibold'
      )}
    >
      {children}
    </button>
  );
}
