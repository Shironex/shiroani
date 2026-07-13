import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Bell, BellRing } from 'lucide-react';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { useSubscribeBellButton } from './SubscribeBellButton.hooks';
import type { ISubscribeBellButtonProps } from './SubscribeBellButton.types';

function SubscribeBellButton({
  anime,
  className,
  iconClassName = 'w-3.5 h-3.5',
  tooltipSide = 'top',
}: ISubscribeBellButtonProps) {
  const { t } = useTranslation('schedule');
  const { isSubscribed, toggle, mediaId } = useSubscribeBellButton(anime);

  if (!mediaId) return null;

  return (
    <TooltipButton
      variant="ghost"
      size="icon"
      className={cn(
        'opacity-0 group-hover:opacity-100 transition-opacity',
        'focus-visible:opacity-100 group-focus-within:opacity-100',
        isSubscribed && 'opacity-100',
        className
      )}
      tooltip={isSubscribed ? t('subscribe.disable') : t('subscribe.enable')}
      tooltipSide={tooltipSide}
      onClick={toggle}
    >
      {isSubscribed ? (
        <BellRing className={cn(iconClassName, 'text-primary')} />
      ) : (
        <Bell className={iconClassName} />
      )}
    </TooltipButton>
  );
}

export default memo(SubscribeBellButton);
