import { useTranslation } from 'react-i18next';
import { useStreamingEpisodesSection } from './StreamingEpisodesSection.hooks';
import { FieldLabel, StreamingEpisodeCard } from './StreamingEpisodesSection.parts';
import type { IStreamingEpisodesSectionProps } from './StreamingEpisodesSection.types';

/**
 * AniList's `streamingEpisodes` is an unbounded list field (no `perPage`), so a
 * long-running series can return hundreds of entries. Cap the rendered thumbnails
 * to keep this image-heavy row light; the full list lives on the streaming site.
 */
const MAX_STREAMING_EPISODES = 50;

/**
 * Per-episode legal streaming links (title + thumbnail + provider site). Distinct
 * from the platform-level external STREAMING links — these point at a specific
 * episode on a licensed streaming site and open in the system browser.
 *
 * PERF: image-heavy scrollable row — repeated cards avoid hover-scale / translate.
 */
export default function StreamingEpisodesSection({ episodes }: IStreamingEpisodesSectionProps) {
  const { t } = useTranslation('library');
  useStreamingEpisodesSection();

  if (episodes.length === 0) return null;

  const cards = episodes
    .slice(0, MAX_STREAMING_EPISODES)
    .map(ep => <StreamingEpisodeCard key={ep.url} episode={ep} />);

  return (
    <div className="space-y-2">
      <FieldLabel>{t('streamingEpisodes.title')}</FieldLabel>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">{cards}</div>
    </div>
  );
}
