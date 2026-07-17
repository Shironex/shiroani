import { SelectableChipButton } from '@/components/settings/SelectableChipButton';
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
    <SelectableChipButton
      active={active}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center gap-2 py-[6px] text-[12px] focus-visible:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {children}
    </SelectableChipButton>
  );
}
