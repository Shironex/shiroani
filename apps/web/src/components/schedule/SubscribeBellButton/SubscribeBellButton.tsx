import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Bell, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { useSubscribeBellButton } from './SubscribeBellButton.hooks';
import type { ISubscribeBellButtonProps } from './SubscribeBellButton.types';

function SubscribeBellButton({
  anime,
  className,
  iconClassName = 'w-3.5 h-3.5',
  tooltipSide = 'top',
  alwaysVisible = false,
  noTooltip = false,
}: ISubscribeBellButtonProps) {
  const { t } = useTranslation('schedule');
  const { isSubscribed, toggle, mediaId } = useSubscribeBellButton(anime);

  if (!mediaId) return null;

  const label = isSubscribed ? t('subscribe.disable') : t('subscribe.enable');
  const buttonClassName = cn(
    !alwaysVisible && [
      'opacity-0 group-hover:opacity-100 transition-opacity',
      'focus-visible:opacity-100 group-focus-within:opacity-100',
      isSubscribed && 'opacity-100',
    ],
    className
  );
  const icon = isSubscribed ? (
    <BellRing className={cn(iconClassName, 'text-primary')} />
  ) : (
    <Bell className={iconClassName} />
  );

  if (noTooltip) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={buttonClassName}
        onClick={toggle}
        aria-pressed={isSubscribed}
        aria-label={label}
      >
        {icon}
      </Button>
    );
  }

  return (
    <TooltipButton
      variant="ghost"
      size="icon"
      className={buttonClassName}
      tooltip={label}
      tooltipSide={tooltipSide}
      onClick={toggle}
      aria-pressed={isSubscribed}
    >
      {icon}
    </TooltipButton>
  );
}

export default memo(SubscribeBellButton);
