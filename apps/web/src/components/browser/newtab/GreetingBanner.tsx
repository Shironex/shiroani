import { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { toLocalDate } from '@shiroani/shared';
// Note: removed `pluralize` import — greeting subtitle now uses i18next CLDR plurals
// via <Trans>, which works for both PL and EN.
import { APP_LOGO_URL } from '@/lib/constants';
import { useProfileStore } from '@/stores/useProfileStore';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useFeedStore } from '@/stores/useFeedStore';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import { useEpisodesWaitingCount } from '@/hooks/useEpisodesWaiting';
import { cn } from '@/lib/utils';

/**
 * Time-aware greeting banner shown at the top of the newtab page.
 *
 * Anatomy (matches the "Dobry wieczór, Aleks" mock):
 *   - Left:  the connected AniList viewer's avatar when linked, otherwise the
 *            chibi mascot, inside a soft primary-tinted circle.
 *   - Right: Shippori Mincho greeting ("Dzień dobry" / "Dobry wieczór") plus
 *            the viewer's display name, with a muted subtitle that
 *            summarises what the user can act on right now.
 *
 * Name fallback chain:
 *   1. User's display name from settings (set during onboarding / Settings → Profil)
 *   2. Connected AniList viewer's handle (`status.viewer.name`)
 *   3. Connected AniList profile's display name (`profile.name`)
 *   4. The username the user typed when syncing AniList
 *   5. (none) — greeting renders solo, no trailing comma
 *
 * Subtitle priority (first match wins):
 *   1. Episodes waiting across watching-status library titles (B1)
 *      + unread feed items since last Feed visit (B2)
 *   2. Today's schedule teaser
 *   3. "Miłego oglądania." fallback
 */
export function GreetingBanner({ showName }: { showName: boolean }) {
  const { t } = useTranslation('browser');
  const profile = useProfileStore(s => s.profile);
  const storedUsername = useProfileStore(s => s.username);
  const settingsDisplayName = useSettingsStore(s => s.displayName);

  // Connected AniList account — its handle/avatar personalize the banner.
  const anilistConnected = useAniListAuthStore(s => s.status.connected);
  const anilistViewer = useAniListAuthStore(s => s.status.viewer);
  const connectedViewer = anilistConnected ? anilistViewer : undefined;

  // The user's own name wins — then the connected AniList handle, then whatever
  // else AniList surfaces as a fallback.
  const displayName = (
    settingsDisplayName ||
    connectedViewer?.name ||
    profile?.name ||
    storedUsername ||
    ''
  ).trim();

  const todayKey = useMemo(() => toLocalDate(new Date()), []);
  const todayEntries = useScheduleStore(s => s.schedule[todayKey]);
  const todayCount = todayEntries?.length ?? 0;

  const episodesWaiting = useEpisodesWaitingCount();
  const feedItems = useFeedStore(s => s.items);
  const feedLastVisitedAt = useFeedStore(s => s.lastVisitedAt);
  const unreadFeedCount = useMemo(() => {
    if (!feedItems.length) return 0;
    return feedItems.reduce((n, item) => {
      if (!item.publishedAt) return n;
      const ts = new Date(item.publishedAt).getTime();
      return Number.isFinite(ts) && ts > feedLastVisitedAt ? n + 1 : n;
    }, 0);
  }, [feedItems, feedLastVisitedAt]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 18) return t('newTab.greeting.morning');
    return t('newTab.greeting.evening');
  }, [t]);

  // A broken AniList avatar URL falls back to the mascot rather than a gap.
  // The avatar tracks the same `showName` preference as the greeting handle, so
  // de-personalizing the greeting reverts the mascot too.
  const [avatarError, setAvatarError] = useState(false);
  const avatarUrl = showName && !avatarError ? connectedViewer?.avatar : undefined;

  return (
    <header className="flex items-center gap-4">
      <div
        aria-hidden="true"
        className={cn(
          'relative grid size-[60px] shrink-0 place-items-center overflow-hidden rounded-full',
          'border border-primary/25 bg-primary/10',
          'shadow-[0_6px_20px_-8px_oklch(from_var(--primary)_l_c_h/0.5)]'
        )}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            draggable={false}
            className="size-full object-cover"
            onError={() => setAvatarError(true)}
          />
        ) : (
          <img src={APP_LOGO_URL} alt="" draggable={false} className="size-10 object-contain" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h1 className="font-serif text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-foreground">
          {greeting}
          {showName && displayName && (
            <>
              , <span className="text-primary">{displayName}</span>
            </>
          )}
        </h1>
        <GreetingSubtitle
          episodesWaiting={episodesWaiting}
          unreadFeedCount={unreadFeedCount}
          todayCount={todayCount}
        />
      </div>
    </header>
  );
}

interface GreetingSubtitleProps {
  episodesWaiting: number;
  unreadFeedCount: number;
  todayCount: number;
}

function GreetingSubtitle({ episodesWaiting, unreadFeedCount, todayCount }: GreetingSubtitleProps) {
  const { t } = useTranslation('browser');
  const hasActionableNews = episodesWaiting > 0 || unreadFeedCount > 0;
  const boldStrong = <b className="font-semibold text-foreground" />;

  if (hasActionableNews) {
    return (
      <p className="mt-1 text-[13px] text-muted-foreground">
        {episodesWaiting > 0 && (
          <Trans
            ns="browser"
            i18nKey="newTab.greeting.subtitle.episodesWaiting"
            count={episodesWaiting}
            components={{ 1: boldStrong }}
          />
        )}
        {episodesWaiting > 0 && unreadFeedCount > 0 && ' · '}
        {unreadFeedCount > 0 && (
          <Trans
            ns="browser"
            i18nKey="newTab.greeting.subtitle.feedUnread"
            count={unreadFeedCount}
            components={{ 1: boldStrong }}
          />
        )}
        .
      </p>
    );
  }

  if (todayCount > 0) {
    return (
      <p className="mt-1 text-[13px] text-muted-foreground">
        <Trans
          ns="browser"
          i18nKey="newTab.greeting.subtitle.todaySchedule"
          count={todayCount}
          components={{ 1: boldStrong }}
        />
      </p>
    );
  }

  return (
    <p className="mt-1 text-[13px] text-muted-foreground">
      {t('newTab.greeting.subtitle.default')}
    </p>
  );
}
