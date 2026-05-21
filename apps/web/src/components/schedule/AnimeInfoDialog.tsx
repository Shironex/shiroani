import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { stripHtmlSimple } from '@/lib/html-text';
import { getAnimeTitle } from '@/lib/anime-utils';
import { emitAsync } from '@/lib/socketHelpers';
import { useNavigateToBrowser } from '@/hooks/useNavigateToBrowser';
import { useNotificationToggle } from '@/hooks/useNotificationToggle';
import type { AiringAnime, AnimeDetail } from '@shiroani/shared';
import { AnimeEvents } from '@shiroani/shared';
import { AnimeInfoHeader } from './anime-info/AnimeInfoHeader';
import { AnimeInfoStats } from './anime-info/AnimeInfoStats';
import { AnimeInfoMeta } from './anime-info/AnimeInfoMeta';
import { AnimeInfoPeople } from './anime-info/AnimeInfoPeople';
import { AnimeInfoLinks } from './anime-info/AnimeInfoLinks';

interface AnimeInfoDialogProps {
  anime: AiringAnime | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AnimeInfoDialog({ anime, open, onOpenChange }: AnimeInfoDialogProps) {
  // Subscribe to language changes so the imperative anilist label getters
  // re-evaluate on the next render when the user switches language.
  const { i18n } = useTranslation('anilist');
  const [details, setDetails] = useState<AnimeDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const navigateToBrowser = useNavigateToBrowser();
  const { isSubscribed, toggle } = useNotificationToggle(
    anime?.media.id ?? 0,
    anime as AiringAnime
  );

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

  if (!anime) return null;

  const coverUrl =
    details?.coverImage?.extraLarge ??
    details?.coverImage?.large ??
    anime.media.coverImage.large ??
    anime.media.coverImage.medium;
  const bannerUrl = details?.bannerImage;
  const accentColor = details?.coverImage?.color;
  const format = details?.format ?? anime.media.format;
  const status = details?.status ?? anime.media.status;
  const episodes = details?.episodes ?? anime.media.episodes;
  const genres = details?.genres ?? anime.media.genres;
  const cleanDescription =
    details?.description != null ? stripHtmlSimple(details.description) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>

        <AnimeInfoHeader
          title={title}
          details={details}
          coverUrl={coverUrl}
          bannerUrl={bannerUrl}
          accentColor={accentColor}
          isSubscribed={isSubscribed}
          onToggleSubscribe={toggle}
        />

        {/* Content */}
        <div className="px-5 pb-5 space-y-4">
          <AnimeInfoStats
            anime={anime}
            details={details}
            topRanking={topRanking}
            format={format}
            status={status}
            episodes={episodes}
          />

          <AnimeInfoMeta
            details={details}
            mainStudios={mainStudios}
            genres={genres}
            nonSpoilerTags={nonSpoilerTags}
            cleanDescription={cleanDescription}
            loading={loading}
            descExpanded={descExpanded}
            onToggleDesc={() => setDescExpanded(v => !v)}
            language={i18n.language}
          />

          <AnimeInfoPeople details={details} />

          <AnimeInfoLinks
            details={details}
            streamingLinks={streamingLinks}
            onNavigate={handleNavigate}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
