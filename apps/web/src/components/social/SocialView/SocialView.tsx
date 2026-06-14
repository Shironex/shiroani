import { useTranslation } from 'react-i18next';
import { Users, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ViewHeader } from '@/components/shared/ViewHeader';
import { KanjiWatermark } from '@/components/shared/KanjiWatermark';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { useSocialView } from './SocialView.hooks';
import { SocialBody } from './SocialView.parts';

/**
 * Community view (Społeczność) — the activity feed of the people the connected
 * AniList viewer follows. Gates on connection: a disconnected user gets a
 * "connect AniList" prompt rather than an empty list.
 */
export default function SocialView() {
  const { t } = useTranslation('social');
  const { connected, activities, isLoading, error, onRetry } = useSocialView();

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in relative">
      <ViewHeader
        icon={Users}
        title={t('view.title')}
        subtitle={t('view.subtitle')}
        actions={
          connected ? (
            <TooltipButton
              variant="ghost"
              size="icon"
              className="w-8 h-8"
              onClick={onRetry}
              disabled={isLoading}
              tooltip={t('view.actions.refresh')}
              tooltipSide="bottom"
              aria-label={t('view.actions.refreshAria')}
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
            </TooltipButton>
          ) : undefined
        }
      />

      <div className="flex-1 relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <KanjiWatermark kanji="絆" position="br" size={280} opacity={0.03} />
        </div>

        <div className="relative z-[1] h-full overflow-y-auto px-7 py-5">
          <SocialBody
            connected={connected}
            activities={activities}
            isLoading={isLoading}
            error={error}
            onRetry={onRetry}
          />
        </div>
      </div>
    </div>
  );
}
