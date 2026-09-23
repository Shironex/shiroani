import type {
  AnimeDetail,
  AnimeDetailExternalLink,
  AnimeDetailStreamingEpisode,
} from '@shiroani/shared';

export interface IAnimeInfoLinksProps {
  details: AnimeDetail | null;
  streamingLinks: AnimeDetailExternalLink[];
  onNavigate: (url: string) => void;
}

export type IAnimeInfoLinksView = Record<string, never>;

export interface IStreamingLinksListProps {
  streamingLinks: AnimeDetailExternalLink[];
  onNavigate: (url: string) => void;
}

export interface IStreamingEpisodesListProps {
  episodes: AnimeDetailStreamingEpisode[];
}
