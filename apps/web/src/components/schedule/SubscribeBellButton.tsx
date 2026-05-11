import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Bell, BellRing } from 'lucide-react';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { useNotificationToggle } from '@/hooks/useNotificationToggle';
import type { AiringAnime } from '@shiroani/shared';

export interface SubscribeBellButtonProps {
  anime: AiringAnime;
  /** Extra classes for the button wrapper (sizing, positioning, backdrop, etc.) */
  className?: string;
  /** Icon size classes — defaults to "w-3.5 h-3.5" */
  iconClassName?: string;
  /** Tooltip placement — defaults to "top" */
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right';
}

const SubscribeBellButton = memo(function SubscribeBellButton({
  anime,
  className,
  iconClassName = 'w-3.5 h-3.5',
  tooltipSide = 'top',
}: SubscribeBellButtonProps) {
  const { t } = useTranslation('schedule');
  const mediaId = anime.media.id;
  const { isSubscribed, toggle } = useNotificationToggle(mediaId, anime);

  if (!mediaId) return null;

  return (
    <TooltipButton
      variant="ghost"
      size="icon"
      className={cn(
        'opacity-0 group-hover:opacity-100 transition-opacity',
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
});

export { SubscribeBellButton };
