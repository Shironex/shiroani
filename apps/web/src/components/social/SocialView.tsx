import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ViewHeader } from '@/components/shared/ViewHeader';
import { KanjiWatermark } from '@/components/shared/KanjiWatermark';
import { AniListErrorState } from '@/components/shared/AniListErrorState';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { useSocialFeed } from '@/hooks/useSocialFeed';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import { SocialActivityRow } from './SocialActivityRow';

const SKELETON_ROWS = [0, 1, 2, 3, 4];

/**
 * Community view (Społeczność) — the activity feed of the people the connected
 * AniList viewer follows ({@link useSocialFeed} → GET_SOCIAL_FEED).
 *
 * Gates on `status.connected`: the feed is token-relative, so a disconnected
 * user gets a "connect AniList" prompt rather than an empty list (which would
 * read as a bug). Auth status is fetched lazily app-wide (no boot call), so this
 * view resolves it on mount — otherwise a genuinely-connected user who lands
 * here first would see the connect prompt.
 */
export function SocialView() {
  const { t } = useTranslation('social');
  const connected = useAniListAuthStore(s => s.status.connected);
  const fetchStatus = useAniListAuthStore(s => s.fetchStatus);
  const { activities, isLoading, error, refetch } = useSocialFeed();

  // Resolve auth status on mount — see component docstring.
  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

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
              onClick={refetch}
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
            onRetry={refetch}
          />
        </div>
      </div>
    </div>
  );
}

interface SocialBodyProps {
  connected: boolean;
  activities: ReturnType<typeof useSocialFeed>['activities'];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

function SocialBody({ connected, activities, isLoading, error, onRetry }: SocialBodyProps) {
  const { t } = useTranslation('social');

  // Feed is viewer-scoped: without a connected account there's nothing to fetch.
  if (!connected) {
    return <SocialEmpty message={t('feed.notConnected')} />;
  }

  if (error) {
    return <AniListErrorState error={error} onRetry={onRetry} />;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-1.5" aria-busy="true" aria-label={t('feed.loadingAria')}>
        {SKELETON_ROWS.map(i => (
          <SkeletonRow key={i} />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return <SocialEmpty message={t('feed.empty')} />;
  }

  return (
    <div className="flex flex-col gap-1.5 max-w-2xl mx-auto">
      {activities.map(item => (
        <SocialActivityRow key={item.id} item={item} />
      ))}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-1.5 px-2.5 rounded-lg bg-foreground/3 border border-border-glass/60 max-w-2xl mx-auto w-full">
      <div className="w-10 h-14 shrink-0 rounded-md bg-foreground/5 animate-pulse" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-2.5 w-1/3 rounded bg-foreground/5 animate-pulse" />
        <div className="h-3 w-2/5 rounded bg-foreground/5 animate-pulse" />
        <div className="h-2.5 w-1/4 rounded bg-foreground/5 animate-pulse" />
      </div>
    </div>
  );
}

function SocialEmpty({ message }: { message: string }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-2.5 rounded-xl px-5 py-8 text-center',
          'border border-border-glass bg-foreground/3 max-w-md'
        )}
      >
        <div className="grid place-items-center w-9 h-9 rounded-xl border border-border-glass bg-foreground/5 text-muted-foreground/60">
          <Users className="w-4 h-4" aria-hidden="true" />
        </div>
        <p className="text-[12px] text-muted-foreground/70 leading-snug max-w-[40ch]">{message}</p>
      </div>
    </div>
  );
}
