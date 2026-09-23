import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { stripHtmlSimple } from '@/lib/html-text';
import { getAnimeTitle } from '@/lib/anime-utils';
import { emitAsync } from '@/lib/socketHelpers';
import { useNavigateToBrowser } from '@/hooks/useNavigateToBrowser';
import type { AiringAnime, AnimeDetail } from '@shiroani/shared';
import { AnimeEvents } from '@shiroani/shared';
import type { IAnimeInfoDialogView } from './AnimeInfoDialog.types';

/**
 * All state, effects, memos and callbacks for AnimeInfoDialog. Returns a view
 * object so the shell can stay a pure presentational pass-through.
 */
export function useAnimeInfoDialog(
  anime: AiringAnime | null,
  open: boolean,
  onOpenChange: (open: boolean) => void
): IAnimeInfoDialogView {
  // Subscribe to language changes so the imperative anilist label getters
  // re-evaluate on the next render when the user switches language.
  const { i18n } = useTranslation('anilist');
  const [details, setDetails] = useState<AnimeDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const navigateToBrowser = useNavigateToBrowser();

  const fetchDetails = useCallback(async (anilistId: number) => {
    setLoading(true);
    setDetails(null);
    setDescExpanded(false);
    try {
      const response = await emitAsync<{ anilistId: number }, { anime: AnimeDetail }>(
        AnimeEvents.GET_DETAILS,
        { anilistId }
      );
      setDetails(response.anime);
    } catch {
      // silently fail — we still show basic info from the schedule entry
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && anime) {
      fetchDetails(anime.media.id);
    }
    if (!open) {
      setDetails(null);
    }
  }, [open, anime, fetchDetails]);

  const title = useMemo(() => {
    if (!anime) return '';
    return getAnimeTitle(anime.media);
  }, [anime]);

  const mainStudios = useMemo(() => {
    if (!details?.studios?.edges) return [];
    return details.studios.edges.filter(e => e.isMain).map(e => e.node.name);
  }, [details]);

  const nonSpoilerTags = useMemo(() => {
    if (!details?.tags) return [];
    return details.tags.filter(t => !t.isGeneralSpoiler && !t.isMediaSpoiler).slice(0, 12);
  }, [details]);

  const streamingLinks = useMemo(() => {
    if (!details?.externalLinks) return [];
    return details.externalLinks.filter(l => l.type === 'STREAMING');
  }, [details]);

  const topRanking = useMemo(() => {
    if (!details?.rankings) return null;
    return (
      details.rankings.find(r => r.allTime && r.type === 'RATED') ??
      details.rankings.find(r => r.allTime && r.type === 'POPULAR') ??
      details.rankings[0] ??
      null
    );
  }, [details]);

  const handleNavigate = useCallback(
    (url: string) => {
      navigateToBrowser(url);
      onOpenChange(false);
    },
    [navigateToBrowser, onOpenChange]
  );

  // Derived display values — guarded for `anime === null` so the shell can
  // render its null-guard from the returned view without crashing here.
  const coverUrl =
    details?.coverImage?.extraLarge ??
    details?.coverImage?.large ??
    anime?.media.coverImage.large ??
    anime?.media.coverImage.medium;
  const bannerUrl = details?.bannerImage;
  const accentColor = details?.coverImage?.color;
  const format = details?.format ?? anime?.media.format;
  const status = details?.status ?? anime?.media.status;
  const episodes = details?.episodes ?? anime?.media.episodes;
  const genres = details?.genres ?? anime?.media.genres ?? [];
  const cleanDescription =
    details?.description != null ? stripHtmlSimple(details.description) : undefined;

  return {
    anime,
    details,
    loading,
    descExpanded,
    setDescExpanded,
    handleNavigate,
    title,
    language: i18n.language,
    coverUrl,
    bannerUrl,
    accentColor,
    format,
    status,
    episodes,
    genres,
    cleanDescription,
    mainStudios,
    nonSpoilerTags,
    streamingLinks,
    topRanking,
  };
}
