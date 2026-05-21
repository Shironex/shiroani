import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Compass, SearchX, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/shared/EmptyState';
import { AniListErrorState } from '@/components/shared/AniListErrorState';
import { KanjiWatermark } from '@/components/shared/KanjiWatermark';
import { ViewHeader } from '@/components/shared/ViewHeader';
import { DiscoverCard } from '@/components/discover/DiscoverCard';
import { DiscoverSkeleton } from '@/components/discover/DiscoverSkeleton';
import { RandomDiscoveryPanel } from '@/components/discover/RandomDiscoveryPanel';
import { getTitle } from '@/components/discover/random/random-utils';
import { AnimeInfoDialog } from '@/components/schedule/AnimeInfoDialog';
import { useDiscoverStore, type DiscoverMedia } from '@/stores/useDiscoverStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import type { AiringAnime } from '@shiroani/shared';

type Tab = 'trending' | 'popular' | 'seasonal' | 'random';

/** Set of anilistIds present in the user's library */
function useLibraryAnilistIds(): Set<number> {
  const entries = useLibraryStore(s => s.entries);
  return useMemo(
    () => new Set(entries.map(e => e.anilistId).filter(Boolean) as number[]),
    [entries]
  );
}

export function DiscoverView() {
  const { t } = useTranslation('discover');
  const TABS = useMemo<{ value: Tab; label: string }[]>(
    () => [
      { value: 'trending', label: t('tabs.trending') },
      { value: 'popular', label: t('tabs.popular') },
      { value: 'seasonal', label: t('tabs.seasonal') },
      { value: 'random', label: t('tabs.random') },
    ],
    [t]
  );
  const activeTab = useDiscoverStore(s => s.activeTab);
  const searchQuery = useDiscoverStore(s => s.searchQuery);
  const isLoading = useDiscoverStore(s => s.isLoading);
  const isSearching = useDiscoverStore(s => s.isSearching);
  const error = useDiscoverStore(s => s.error);

  const trending = useDiscoverStore(s => s.trending);
  const popular = useDiscoverStore(s => s.popular);
  const seasonal = useDiscoverStore(s => s.seasonal);
  const searchResults = useDiscoverStore(s => s.searchResults);

  const trendingPage = useDiscoverStore(s => s.trendingPage);
  const popularPage = useDiscoverStore(s => s.popularPage);
  const seasonalPage = useDiscoverStore(s => s.seasonalPage);
  const searchPage = useDiscoverStore(s => s.searchPage);

  const libraryIds = useLibraryAnilistIds();

  const [selectedAnime, setSelectedAnime] = useState<AiringAnime | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCardClick = useCallback((media: DiscoverMedia) => {
    // Map DiscoverMedia to a minimal AiringAnime shape for the dialog
    const asAiring: AiringAnime = {
      id: media.id,
      airingAt: media.nextAiringEpisode?.airingAt ?? 0,
      episode: media.nextAiringEpisode?.episode ?? 0,
      media: {
        id: media.id,
        title: media.title,
        coverImage: media.coverImage,
        episodes: media.episodes,
        status: media.status ?? 'UNKNOWN',
        genres: media.genres ?? [],
        format: media.format,
        averageScore: media.averageScore,
        popularity: media.popularity,
      },
    };
    setSelectedAnime(asAiring);
    setDialogOpen(true);
  }, []);

  const handleAddToLibrary = useCallback(
    (media: DiscoverMedia) => {
      const title = getTitle(media.title);
      const entries = useLibraryStore.getState().entries;
      const alreadyByAnilist = entries.some(e => e.anilistId === media.id);
      const alreadyByTitle = entries.some(e => e.title.toLowerCase() === title.toLowerCase());
      if (alreadyByAnilist || alreadyByTitle) {
        toast.error(t('toast.alreadyInLibrary'));
        return;
      }

      try {
        useLibraryStore.getState().addToLibrary({
          anilistId: media.id,
          title,
          titleRomaji: media.title.romaji,
          titleNative: media.title.native,
          coverImage:
            media.coverImage.large || media.coverImage.extraLarge || media.coverImage.medium,
          episodes: media.episodes,
          status: 'plan_to_watch',
        });
        toast.success(t('toast.addedToLibrary'), { description: title });
      } catch {
        toast.error(t('toast.addFailed'));
      }
    },
    [t]
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialFetchDone = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Fetch trending on mount
  useEffect(() => {
    if (initialFetchDone.current) return;
    initialFetchDone.current = true;
    const { fetchTrending, trending } = useDiscoverStore.getState();
    if (trending.length === 0) fetchTrending();
  }, []);

  // Handle tab change — fetch if data is empty
  const handleTabChange = useCallback((tab: Tab) => {
    const store = useDiscoverStore.getState();
    store.setTab(tab);
    if (tab === 'trending' && store.trending.length === 0) store.fetchTrending();
    else if (tab === 'popular' && store.popular.length === 0) store.fetchPopular();
    else if (tab === 'seasonal' && store.seasonal.length === 0) store.fetchSeasonal();
    else if (tab === 'random' && store.randomPool.length === 0) store.fetchRandomPool();
  }, []);

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    const store = useDiscoverStore.getState();
    store.setSearchQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim()) {
      debounceRef.current = setTimeout(() => {
        useDiscoverStore.getState().search(value.trim());
      }, 400);
    }
  }, []);

  const handleClearSearch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    useDiscoverStore.getState().clearSearch();
  }, []);

  const handleRetry = useCallback(() => {
    const store = useDiscoverStore.getState();
    if (store.isSearching && store.searchQuery.trim()) {
      store.search(store.searchQuery.trim());
    } else {
      switch (store.activeTab) {
        case 'trending':
          store.fetchTrending();
          break;
        case 'popular':
          store.fetchPopular();
          break;
        case 'seasonal':
          store.fetchSeasonal();
          break;
        case 'random':
          store.fetchRandomPool();
          break;
      }
    }
  }, []);

  // Infinite scroll — callback ref so the observer re-attaches when the sentinel mounts/unmounts
  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (!node) return;

    observerRef.current = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          const state = useDiscoverStore.getState();
          if (!state.isLoading) state.loadMore();
        }
      },
      { rootMargin: '200px' }
    );
    observerRef.current.observe(node);
  }, []);

  // Determine which data to display
  const isSearchMode = searchQuery.trim().length > 0;
  const isRandomMode = !isSearchMode && activeTab === 'random';

  const items = isSearchMode
    ? searchResults
    : activeTab === 'trending'
      ? trending
      : activeTab === 'popular'
        ? popular
        : activeTab === 'seasonal'
          ? seasonal
          : [];

  const page = isSearchMode
    ? searchPage
    : activeTab === 'trending'
      ? trendingPage
      : activeTab === 'popular'
        ? popularPage
        : activeTab === 'seasonal'
          ? seasonalPage
          : { current: 1, hasNext: false };

  const showLoading = isSearchMode ? isSearching : isLoading;
  const showEmpty = !isRandomMode && !showLoading && items.length === 0;
  const showGrid = !isRandomMode && items.length > 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in relative">
      <ViewHeader<Tab>
        icon={Compass}
        title={t('title')}
        subtitle={t('subtitle')}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        searchPlaceholder={t('searchPlaceholder')}
        filters={isSearchMode ? undefined : TABS}
        activeFilter={activeTab}
        onFilterChange={handleTabChange}
      />

      {/* Search-mode banner — ViewHeader hides its filter row while searching,
          so surface the "Wyniki wyszukiwania" label + quick clear here. */}
      {isSearchMode && (
        <div className="px-7 pb-3 border-b border-border-glass shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary/90 font-semibold">
              {t('search.resultsLabel')}
            </span>
            <button
              onClick={handleClearSearch}
              className="flex items-center gap-1 text-2xs text-muted-foreground hover:text-foreground/70 transition-colors"
            >
              <X className="w-3 h-3" />
              {t('search.clear')}
            </button>
          </div>
        </div>
      )}

      {/* ── Content region with clipped kanji watermark layer ──────── */}
      <div className="flex-1 relative overflow-hidden">
        {/* Decorative kanji watermark — 探 (saga/tan: search / explore).
            Clipped wrapper keeps the glyph's negative offsets from producing
            scrollbars on either axis. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <KanjiWatermark kanji="探" position="br" size={300} opacity={0.03} />
        </div>

        <div className="absolute inset-0 overflow-y-auto overflow-x-hidden">
          <div className="relative z-[1] px-7 pt-5 pb-24">
            {/* Random discovery — owns its own loading/error/empty */}
            {isRandomMode && (
              <RandomDiscoveryPanel
                libraryIds={libraryIds}
                onCardClick={handleCardClick}
                onError={handleRetry}
              />
            )}

            {/* Error state */}
            {!isRandomMode && error && !showLoading && (
              <AniListErrorState error={error} onRetry={handleRetry} />
            )}

            {/* Loading state — only show skeleton on initial load (no items yet) */}
            {!isRandomMode && showLoading && items.length === 0 && <DiscoverSkeleton />}

            {/* Empty state */}
            {showEmpty && !error && (
              <EmptyState
                icon={isSearchMode ? SearchX : Compass}
                title={isSearchMode ? t('empty.noResultsTitle') : t('empty.noAnimeTitle')}
                subtitle={isSearchMode ? t('empty.noResultsSubtitle') : t('empty.noAnimeSubtitle')}
              />
            )}

            {/* Grid — responsive 2:3 anime cards */}
            {showGrid && (
              <div
                className={cn(
                  'grid gap-3.5',
                  'grid-cols-2',
                  'sm:grid-cols-3',
                  'md:grid-cols-4',
                  'lg:grid-cols-5',
                  '2xl:grid-cols-6'
                )}
              >
                {items.map(media => (
                  <DiscoverCard
                    key={media.id}
                    media={media}
                    inLibrary={libraryIds.has(media.id)}
                    onClick={() => handleCardClick(media)}
                    onAddToLibrary={handleAddToLibrary}
                  />
                ))}
              </div>
            )}

            {/* Infinite scroll sentinel */}
            {!isRandomMode && page.hasNext && (
              <div ref={sentinelRef} className="flex justify-center py-8">
                {isLoading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimeInfoDialog anime={selectedAnime} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
