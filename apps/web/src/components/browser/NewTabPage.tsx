import { useState, useCallback, useMemo, useEffect } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Plus, X, Eye, CalendarDays, Bookmark, Clock, Play, Globe2, History } from 'lucide-react';
import { toLocalDate } from '@shiroani/shared';
// Note: removed `pluralize` import — greeting subtitle now uses i18next CLDR plurals
// via <Trans>, which works for both PL and EN.
import { APP_LOGO_URL } from '@/lib/constants';
import { useProfileStore } from '@/stores/useProfileStore';
import type { QuickAccessSite, FrequentSite, AiringAnime, AnimeEntry } from '@shiroani/shared';
import { useQuickAccessStore } from '@/stores/useQuickAccessStore';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { useAppStore } from '@/stores/useAppStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useFeedStore } from '@/stores/useFeedStore';
import { useEpisodesWaitingCount } from '@/hooks/useEpisodesWaiting';
import { PREDEFINED_SITES } from '@/lib/quick-access-defaults';
import { useShallow } from 'zustand/react/shallow';
import { hostFromUrl } from '@/lib/url-utils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PillTag } from '@/components/ui/pill-tag';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { KanjiWatermark } from '@/components/shared/KanjiWatermark';
import { formatTime } from '@/components/schedule/schedule-utils';
import { getAnimeTitle, getCoverUrl } from '@/lib/anime-utils';
import { handleImageError } from '@/lib/image-utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface NewTabPageProps {
  onNavigate: (url: string) => void;
}

/**
 * Resolve a high-resolution logo URL for a quick-access tile.
 *
 * Prefers a freshly-constructed Google favicon URL at sz=128 (gives a
 * sharper image than the default 16/32 px favicons shipped on site.icon).
 * Falls back to the site's own icon, then `null` so the tile can render a
 * text fallback.
 */
function getLogoUrl(site: QuickAccessSite): string | null {
  try {
    const host = new URL(site.url).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
  } catch {
    return site.icon ?? null;
  }
}

export function NewTabPage({ onNavigate }: NewTabPageProps) {
  const { t } = useTranslation('browser');
  const { customSites, frequentSites, hiddenPredefinedIds } = useQuickAccessStore(
    useShallow(s => ({
      customSites: s.sites,
      frequentSites: s.frequentSites,
      hiddenPredefinedIds: s.hiddenPredefinedIds,
    }))
  );
  const { addSite, removeSite, hidePredefined, showPredefined } = useQuickAccessStore.getState();

  const sites: QuickAccessSite[] = useMemo(() => {
    const visiblePredefined = PREDEFINED_SITES.filter(s => !hiddenPredefinedIds.includes(s.id));
    return [...visiblePredefined, ...customSites];
  }, [hiddenPredefinedIds, customSites]);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteUrl, setNewSiteUrl] = useState('');

  const handleAddSite = useCallback(() => {
    const trimmedName = newSiteName.trim();
    const trimmedUrl = newSiteUrl.trim();
    if (!trimmedName || !trimmedUrl) return;

    const url = trimmedUrl.includes('://') ? trimmedUrl : `https://${trimmedUrl}`;

    let icon: string | undefined;
    try {
      const domain = new URL(url).hostname;
      icon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
      // Invalid URL, skip icon
    }

    addSite({ name: trimmedName, url, icon });
    setNewSiteName('');
    setNewSiteUrl('');
    setIsAddDialogOpen(false);
  }, [newSiteName, newSiteUrl, addSite]);

  const handleRemoveSite = useCallback(
    (site: QuickAccessSite) => {
      if (site.isPredefined) {
        hidePredefined(site.id);
      } else {
        removeSite(site.id);
      }
    },
    [hidePredefined, removeSite]
  );

  const hiddenPredefined = PREDEFINED_SITES.filter(s => hiddenPredefinedIds.includes(s.id));

  return (
    <div className="relative h-full overflow-hidden">
      {/* Decorative kanji watermark — 網 (mou: net / web).
          Clipped wrapper keeps the glyph's negative offsets from producing
          scrollbars on either axis. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <KanjiWatermark kanji="網" position="br" size={320} opacity={0.03} />
      </div>

      <div className="absolute inset-0 overflow-y-auto overflow-x-hidden">
        <div className="relative z-[1] mx-auto w-full max-w-5xl px-7 pt-8 pb-20">
          {/* Greeting banner — time-aware hello + today's queue teaser */}
          <GreetingBanner />

          {/* Airing today horizontal scroll (kept from previous phase) */}
          <AiringTodaySection />

          {/* Main grid: Szybki dostęp + Ostatnio odwiedzone */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 mb-6">
            {/* Quick Access panel */}
            <section
              aria-labelledby="newtab-quick-access"
              className="relative rounded-[14px] border border-border-glass bg-foreground/[0.025] p-4 overflow-hidden min-w-0"
            >
              <PanelHeader
                id="newtab-quick-access"
                icon={Bookmark}
                title={t('newTab.quickAccess.title')}
                meta={t('newTab.quickAccess.tabsCount', { count: sites.length })}
              />

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {sites.map(site => (
                  <SiteCard
                    key={site.id}
                    site={site}
                    onClick={() => onNavigate(site.url)}
                    onRemove={() => handleRemoveSite(site)}
                  />
                ))}
                {/* Add site button — tile shape */}
                <button
                  onClick={() => setIsAddDialogOpen(true)}
                  aria-label={t('newTab.quickAccess.addAria')}
                  className={cn(
                    'group relative flex aspect-[1.7] flex-col items-center justify-center gap-1.5',
                    'rounded-[10px] border border-dashed border-border-glass bg-foreground/[0.02]',
                    'text-muted-foreground transition-colors',
                    'hover:border-primary/40 hover:bg-primary/[0.06] hover:text-primary cursor-pointer'
                  )}
                >
                  <Plus className="w-4 h-4" />
                  <span className="font-mono text-[9px] uppercase tracking-[0.15em]">
                    {t('newTab.quickAccess.add')}
                  </span>
                </button>
              </div>

              {hiddenPredefined.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border-glass/60">
                  <h3 className="mb-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground/80">
                    {t('newTab.quickAccess.hiddenTitle')}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {hiddenPredefined.map(site => (
                      <button
                        key={site.id}
                        onClick={() => showPredefined(site.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-foreground/[0.04] hover:bg-foreground/[0.08] text-[11px] text-muted-foreground hover:text-foreground/80 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        {site.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Recent visits panel */}
            <section
              aria-labelledby="newtab-recent"
              className="relative rounded-[14px] border border-border-glass bg-foreground/[0.025] p-4 overflow-hidden min-w-0"
            >
              <PanelHeader
                id="newtab-recent"
                icon={Clock}
                title={t('newTab.recents.title')}
                meta={frequentSites.length > 0 ? `${frequentSites.length}` : undefined}
              />

              {frequentSites.length > 0 ? (
                <div className="flex flex-col gap-0.5">
                  {frequentSites.slice(0, 8).map(site => (
                    <FrequentSiteRow
                      key={site.url}
                      site={site}
                      onClick={() => onNavigate(site.url)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyRecents />
              )}
            </section>
          </div>

          {/* Resume watching — pulls from library */}
          <ResumeWatchingSection onNavigate={onNavigate} />
        </div>
      </div>

      {/* Add Site Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('newTab.quickAccess.addDialog.title')}</DialogTitle>
            <DialogDescription>{t('newTab.quickAccess.addDialog.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder={t('newTab.quickAccess.addDialog.namePlaceholder')}
              value={newSiteName}
              onChange={e => setNewSiteName(e.target.value)}
              aria-label={t('newTab.quickAccess.addDialog.nameAria')}
              className="h-8 text-sm"
            />
            <Input
              placeholder={t('newTab.quickAccess.addDialog.urlPlaceholder')}
              value={newSiteUrl}
              onChange={e => setNewSiteUrl(e.target.value)}
              aria-label={t('newTab.quickAccess.addDialog.urlAria')}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddSite();
              }}
              className="h-8 text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsAddDialogOpen(false)}>
              {t('actions.cancel', { ns: 'common' })}
            </Button>
            <Button
              size="sm"
              onClick={handleAddSite}
              disabled={!newSiteName.trim() || !newSiteUrl.trim()}
            >
              {t('newTab.quickAccess.addDialog.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface PanelHeaderProps {
  id: string;
  icon: typeof Bookmark;
  title: string;
  meta?: string;
}

function PanelHeader({ id, icon: Icon, title, meta }: PanelHeaderProps) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="grid size-5 place-items-center rounded-md bg-primary/12 text-primary shrink-0">
        <Icon className="w-3 h-3" />
      </span>
      <h2
        id={id}
        className="flex-1 min-w-0 truncate font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
      >
        {title}
      </h2>
      {meta && (
        <span className="shrink-0 font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground/70">
          {meta}
        </span>
      )}
    </div>
  );
}

const MAX_AIRING_CARDS = 12;

/**
 * Time-aware greeting banner shown at the top of the newtab page.
 *
 * Anatomy (matches the "Dobry wieczór, Aleks" mock):
 *   - Left:  chibi mascot avatar inside a soft primary-tinted circle.
 *   - Right: Shippori Mincho greeting ("Dzień dobry" / "Dobry wieczór") plus
 *            the viewer's display name, with a muted subtitle that
 *            summarises what the user can act on right now.
 *
 * Name fallback chain:
 *   1. User's display name from settings (set during onboarding / Settings → Profil)
 *   2. Connected AniList profile's display name (`profile.name`)
 *   3. The username the user typed when syncing AniList
 *   4. (none) — greeting renders solo, no trailing comma
 *
 * Subtitle priority (first match wins):
 *   1. Episodes waiting across watching-status library titles (B1)
 *      + unread feed items since last Feed visit (B2)
 *   2. Today's schedule teaser
 *   3. "Miłego oglądania." fallback
 */
function GreetingBanner() {
  const { t } = useTranslation('browser');
  const profile = useProfileStore(s => s.profile);
  const storedUsername = useProfileStore(s => s.username);
  const settingsDisplayName = useSettingsStore(s => s.displayName);

  // The user's own name wins — then whatever AniList surfaces as a fallback.
  const displayName = (settingsDisplayName || profile?.name || storedUsername || '').trim();

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

  return (
    <header className="mb-6 flex items-center gap-4">
      <div
        aria-hidden="true"
        className={cn(
          'relative grid size-[60px] shrink-0 place-items-center rounded-full',
          'border border-primary/25 bg-primary/10',
          'shadow-[0_6px_20px_-8px_oklch(from_var(--primary)_l_c_h/0.5)]'
        )}
      >
        <img src={APP_LOGO_URL} alt="" draggable={false} className="size-10 object-contain" />
      </div>

      <div className="min-w-0 flex-1">
        <h1 className="font-serif text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-foreground">
          {greeting}
          {displayName && (
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

/** Airing Today section — horizontal scrolling poster cards */
function AiringTodaySection() {
  const { t } = useTranslation('browser');
  const todayKey = useMemo(() => toLocalDate(new Date()), []);

  const todayEntries = useScheduleStore(s => s.schedule[todayKey]);
  const isLoading = useScheduleStore(s => s.isLoading);
  const navigateTo = useAppStore(s => s.navigateTo);

  const libraryEntries = useLibraryStore(s => s.entries);
  const libraryAnilistIds = useMemo(() => {
    const ids = new Set<number>();
    for (const entry of libraryEntries) {
      if (entry.anilistId != null) ids.add(entry.anilistId);
    }
    return ids;
  }, [libraryEntries]);

  const subscribedIds = useNotificationStore(s => s.subscribedIds);

  useEffect(() => {
    if (!todayEntries) {
      useScheduleStore.getState().fetchDaily(todayKey);
    }
  }, [todayKey, todayEntries]);

  const { cards, hasMore } = useMemo(() => {
    if (!todayEntries)
      return { cards: [] as (AiringAnime & { isUser: boolean })[], hasMore: false };

    const sorted = [...todayEntries].sort((a, b) => a.airingAt - b.airingAt);

    // User's anime first, then the rest
    const user: (AiringAnime & { isUser: boolean })[] = [];
    const other: (AiringAnime & { isUser: boolean })[] = [];

    for (const entry of sorted) {
      const mediaId = entry.media.id;
      const isUser = libraryAnilistIds.has(mediaId) || subscribedIds.has(mediaId);
      if (isUser) user.push({ ...entry, isUser: true });
      else other.push({ ...entry, isUser: false });
    }

    const all = [...user, ...other];
    return {
      cards: all.slice(0, MAX_AIRING_CARDS),
      hasMore: all.length > MAX_AIRING_CARDS,
    };
  }, [todayEntries, libraryAnilistIds, subscribedIds]);

  // Loading state
  if (!todayEntries && isLoading) {
    return (
      <div className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <span className="grid size-5 place-items-center rounded-md bg-primary/12 text-primary shrink-0">
            <CalendarDays className="w-3 h-3" />
          </span>
          <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t('newTab.airingToday.title')}
          </h2>
        </div>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-[100px] shrink-0 animate-pulse">
              <div className="aspect-[3/4] rounded-lg bg-muted/40" />
              <div className="mt-1.5 h-3 w-[70%] rounded bg-muted/30" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (!todayEntries || todayEntries.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-5 place-items-center rounded-md bg-primary/12 text-primary shrink-0">
          <CalendarDays className="w-3 h-3" />
        </span>
        <h2 className="flex-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {t('newTab.airingToday.title')}
        </h2>
        <button
          onClick={() => navigateTo('schedule')}
          className="font-mono text-[10px] uppercase tracking-[0.15em] text-primary/70 hover:text-primary transition-colors cursor-pointer"
        >
          {t('newTab.airingToday.viewAll')}
        </button>
      </div>

      {/* Horizontal scroll row */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
        {cards.map(entry => (
          <AiringPosterCard key={entry.id} entry={entry} isUser={entry.isUser} />
        ))}

        {/* "More" card */}
        {hasMore && (
          <button
            onClick={() => navigateTo('schedule')}
            className="w-[100px] shrink-0 aspect-[3/4] rounded-lg border border-dashed border-border/40 hover:border-border/70 hover:bg-accent/20 transition-all flex flex-col items-center justify-center gap-1.5 text-muted-foreground/50 hover:text-muted-foreground/80"
          >
            <span className="text-lg">+</span>
            <span className="text-2xs">{t('newTab.airingToday.more')}</span>
          </button>
        )}
      </div>
    </div>
  );
}

/** Small poster card for the airing today horizontal scroll */
function AiringPosterCard({ entry, isUser }: { entry: AiringAnime; isUser?: boolean }) {
  const { t } = useTranslation('browser');
  const [imgError, setImgError] = useState(false);
  const title = getAnimeTitle(entry.media);
  const coverUrl = getCoverUrl(entry.media);
  const time = formatTime(entry.airingAt);

  return (
    <div className="w-[100px] shrink-0 group">
      <div
        className={cn(
          'relative aspect-[3/4] rounded-lg overflow-hidden border transition-all',
          isUser
            ? 'border-primary/30 shadow-[0_0_8px_-2px] shadow-primary/20'
            : 'border-border/20 hover:border-border/50'
        )}
      >
        {coverUrl && !imgError ? (
          <img
            src={coverUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            onError={e => {
              setImgError(true);
              handleImageError(e);
            }}
          />
        ) : (
          <div className="w-full h-full bg-muted/40" />
        )}

        {/* Time badge */}
        <div className="absolute top-1.5 right-1.5">
          <span className="text-[10px] font-medium bg-background/80 text-foreground/80 px-1 py-px rounded">
            {time}
          </span>
        </div>

        {/* Title + episode overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-6">
          <p className="text-2xs font-medium text-white leading-tight line-clamp-2">{title}</p>
          <p className="text-[10px] text-white/60 mt-0.5">
            {t('newTab.airingToday.episodeShort', { episode: entry.episode })}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Resume watching section — pulls currently-watching entries from library. */
function ResumeWatchingSection({ onNavigate }: { onNavigate: (url: string) => void }) {
  const { t } = useTranslation('browser');
  const entries = useLibraryStore(s => s.entries);
  const navigateTo = useAppStore(s => s.navigateTo);

  const watching = useMemo(() => {
    return entries
      .filter(e => e.status === 'watching')
      .sort((a, b) => {
        const ta = new Date(a.updatedAt || a.addedAt).getTime();
        const tb = new Date(b.updatedAt || b.addedAt).getTime();
        return tb - ta;
      })
      .slice(0, 6);
  }, [entries]);

  return (
    <section
      aria-labelledby="newtab-resume"
      className="relative rounded-[14px] border border-border-glass bg-foreground/[0.025] p-4 overflow-hidden"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-5 place-items-center rounded-md bg-primary/12 text-primary shrink-0">
          <Play className="w-3 h-3" />
        </span>
        <h2
          id="newtab-resume"
          className="flex-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
        >
          {t('newTab.resume.title')}
        </h2>
        {watching.length > 0 ? (
          <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground/70">
            {t('newTab.resume.count', { count: watching.length })}
          </span>
        ) : null}
      </div>

      {watching.length === 0 ? (
        <EmptyResumeState onBrowseLibrary={() => navigateTo('library')} />
      ) : (
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
          {watching.map(entry => (
            <ResumeCard
              key={entry.id}
              entry={entry}
              onResume={() => {
                if (entry.resumeUrl) onNavigate(entry.resumeUrl);
                else navigateTo('library');
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ResumeCard({ entry, onResume }: { entry: AnimeEntry; onResume: () => void }) {
  const { t } = useTranslation('browser');
  const [imgError, setImgError] = useState(false);
  const total = entry.episodes ?? 0;
  const current = entry.currentEpisode ?? 0;
  const progress = total > 0 ? Math.min(100, (current / total) * 100) : 0;
  const episodeLabel =
    current > 0 ? `EP ${String(current).padStart(2, '0')}` : t('newTab.resume.episodeUnknown');
  const host = entry.resumeUrl ? hostFromUrl(entry.resumeUrl) : null;

  return (
    <button
      onClick={onResume}
      className="group relative flex w-[200px] shrink-0 flex-col overflow-hidden rounded-[10px] border border-border-glass bg-foreground/[0.04] text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.04] cursor-pointer"
      aria-label={t('newTab.resume.ariaResume', { title: entry.title })}
    >
      <div className="relative h-[96px] w-full overflow-hidden bg-gradient-to-br from-primary/30 to-primary/5">
        {entry.coverImage && !imgError ? (
          <img
            src={entry.coverImage}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,oklch(1_0_0/0.2),transparent_55%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        <div className="absolute left-2 top-2">
          <PillTag variant="muted" className="bg-black/60 text-white/90 backdrop-blur-sm">
            {episodeLabel}
          </PillTag>
        </div>

        <div className="absolute inset-0 grid place-items-center opacity-0 transition-opacity group-hover:opacity-100">
          <span className="grid size-9 place-items-center rounded-full bg-white/90 text-background shadow-lg">
            <Play className="w-4 h-4 fill-current" />
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 p-2.5">
        <p className="line-clamp-1 text-[12px] font-bold leading-tight text-foreground">
          {entry.title}
        </p>
        <p className="line-clamp-1 font-mono text-[10px] text-muted-foreground">
          {host ?? t('newTab.resume.noUrl')}
          {total > 0 && ` · ${current}/${total}`}
        </p>
        {total > 0 && <ProgressBar value={progress} thickness={2} glow />}
      </div>
    </button>
  );
}

function EmptyResumeState({ onBrowseLibrary }: { onBrowseLibrary: () => void }) {
  const { t } = useTranslation('browser');
  return (
    <div className="flex items-center justify-between gap-4 rounded-[10px] border border-dashed border-border-glass bg-foreground/[0.02] px-4 py-5">
      <div className="flex items-start gap-3 min-w-0">
        <span className="grid size-8 place-items-center rounded-md bg-primary/10 text-primary shrink-0">
          <Play className="w-3.5 h-3.5" />
        </span>
        <div className="min-w-0">
          <p className="text-[12.5px] font-semibold text-foreground">
            {t('newTab.resume.empty.title')}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {t('newTab.resume.empty.body')}
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onBrowseLibrary}>
        {t('newTab.resume.empty.cta')}
      </Button>
    </div>
  );
}

function EmptyRecents() {
  const { t } = useTranslation('browser');
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed border-border-glass bg-foreground/[0.02] px-4 py-6 text-center">
      <span className="grid size-8 place-items-center rounded-md bg-primary/10 text-primary">
        <History className="w-3.5 h-3.5" />
      </span>
      <p className="text-[11.5px] font-medium text-foreground/80">
        {t('newTab.recents.empty.title')}
      </p>
      <p className="max-w-[28ch] text-[10.5px] text-muted-foreground">
        {t('newTab.recents.empty.body')}
      </p>
    </div>
  );
}

/**
 * Individual site card — neutral glass tile with a large, faint site-logo
 * overlay instead of random gradients + first-letter kanji. Each tile reads
 * as "this site" because the brand logo (e.g. YouTube red play, Google mark)
 * fills the bottom-right at low opacity.
 */
function SiteCard({
  site,
  onClick,
  onRemove,
}: {
  site: QuickAccessSite;
  onClick: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation('browser');
  const [faviconError, setFaviconError] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const displayHost = hostFromUrl(site.url);
  const logoUrl = useMemo(() => getLogoUrl(site), [site]);

  return (
    <div className="group relative">
      <button
        onClick={onClick}
        className={cn(
          'relative flex aspect-[1.7] w-full flex-col justify-between overflow-hidden',
          'rounded-[10px] border border-border-glass bg-card/50 p-2.5',
          'transition-all cursor-pointer',
          'hover:border-primary/40 hover:bg-card/70',
          'hover:shadow-[0_4px_14px_-6px_oklch(from_var(--primary)_l_c_h/0.5)]'
        )}
      >
        {/* Large logo overlay — replaces the old first-letter kanji + gradient.
            Positioned bottom-right, clipped by the tile's overflow-hidden so
            any overshoot stays inside the card. */}
        {logoUrl && !logoError && (
          <img
            src={logoUrl}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            draggable={false}
            onError={() => setLogoError(true)}
            className={cn(
              'pointer-events-none absolute -right-3 -bottom-3',
              'h-[84px] w-[84px] object-contain opacity-25',
              'transition-all duration-200',
              'group-hover:opacity-40 group-hover:scale-105'
            )}
          />
        )}

        {/* Soft highlight at the top-left corner so dark tiles don't look flat */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,oklch(from_var(--foreground)_l_c_h/0.05),transparent_60%)]"
        />

        <span className="relative z-[1] flex items-center gap-1.5 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {site.icon && !faviconError ? (
            <img
              src={site.icon}
              alt=""
              className="size-3 rounded-[2px]"
              onError={() => setFaviconError(true)}
            />
          ) : (
            <Globe2 className="w-3 h-3" />
          )}
          <span className="truncate">
            {site.isPredefined
              ? t('newTab.quickAccess.tile.saved')
              : (displayHost ?? t('newTab.quickAccess.tile.site'))}
          </span>
        </span>

        <span className="relative z-[1] min-w-0">
          <span className="block truncate text-[12.5px] font-bold text-foreground leading-tight">
            {site.name}
          </span>
          {displayHost && displayHost !== site.name && (
            <span className="mt-0.5 block truncate font-mono text-[9.5px] text-muted-foreground/70">
              {displayHost}
            </span>
          )}
        </span>

        {/* Text-only fallback when the logo fails to load — keeps tile visually
            anchored instead of going blank */}
        {(!logoUrl || logoError) && (
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute right-[-6px] bottom-[-14px]',
              'font-serif text-[52px] font-extrabold leading-none select-none'
            )}
            style={{ color: 'oklch(from var(--foreground) l c h / 0.08)' }}
          >
            {site.name.charAt(0).toUpperCase()}
          </span>
        )}
      </button>
      <button
        onClick={e => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label={t('newTab.quickAccess.removeAria')}
        className="absolute top-1.5 right-1.5 z-10 grid size-5 place-items-center rounded-full bg-black/50 text-white/80 opacity-0 transition-opacity hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100 group-focus-within:opacity-100 cursor-pointer"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

/** Frequent site row — favicon + title + host + time-ago */
function FrequentSiteRow({ site, onClick }: { site: FrequentSite; onClick: () => void }) {
  const { t } = useTranslation('browser');
  const [imgError, setImgError] = useState(false);
  const host = hostFromUrl(site.url) ?? site.url;

  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-foreground/[0.05] cursor-pointer min-w-0"
    >
      {site.favicon && !imgError ? (
        <img
          src={site.favicon}
          alt=""
          className="size-4 rounded-sm shrink-0"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="size-4 rounded-sm bg-muted shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[11.5px] font-medium text-foreground/90 leading-tight">
          {site.title}
        </div>
        <div className="truncate font-mono text-[9.5px] text-muted-foreground leading-tight">
          {host}
        </div>
      </div>
      <span className="shrink-0 font-mono text-[9.5px] text-muted-foreground/70">
        {formatRelativeTime(site.lastVisited, t)}
      </span>
    </button>
  );
}

function formatRelativeTime(timestamp: number, t: TFunction<'browser'>): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return t('newTab.recents.relative.now');
  if (minutes < 60) return t('newTab.recents.relative.minutes', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('newTab.recents.relative.hours', { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t('newTab.recents.relative.days', { count: days });
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return t('newTab.recents.relative.weeks', { count: weeks });
  const months = Math.floor(days / 30);
  return t('newTab.recents.relative.months', { count: months });
}
