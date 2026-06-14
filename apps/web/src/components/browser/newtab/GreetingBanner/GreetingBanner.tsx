import { APP_LOGO_URL } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useGreetingBanner } from './GreetingBanner.hooks';
import { GreetingSubtitle } from './GreetingBanner.parts';
import type { IGreetingBannerProps } from './GreetingBanner.types';

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
export default function GreetingBanner({ showName }: IGreetingBannerProps) {
  const {
    displayName,
    greeting,
    avatarUrl,
    setAvatarError,
    episodesWaiting,
    unreadFeedCount,
    todayCount,
  } = useGreetingBanner(showName);

  const showNameSuffix = showName && displayName;

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
          {showNameSuffix && (
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
