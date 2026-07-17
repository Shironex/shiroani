import type {
  AiringAnime,
  AnimeDetail,
  AnimeDetailExternalLink,
  AnimeDetailRanking,
  AnimeDetailTag,
} from '@shiroani/shared';

export interface IAnimeInfoDialogProps {
  anime: AiringAnime | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Everything the presentational shell needs. The shell is a pure pass-through:
 * all state, effects, memos and callbacks live in {@link useAnimeInfoDialog}.
 */
export interface IAnimeInfoDialogView {
  /** The source schedule entry, or null. Drives the shell's null-guard. */
  readonly anime: AiringAnime | null;
  /** Fetched AniList detail, or null while loading / on failure. */
  readonly details: AnimeDetail | null;
  readonly loading: boolean;
  readonly descExpanded: boolean;
  readonly setDescExpanded: (value: boolean | ((prev: boolean) => boolean)) => void;

  // Navigation
  readonly handleNavigate: (url: string) => void;

  // Derived display values
  readonly title: string;
  readonly language: string;
  readonly coverUrl?: string | null;
  readonly bannerUrl?: string | null;
  readonly accentColor?: string | null;
  readonly format?: string;
  readonly status?: string;
  readonly episodes?: number | null;
  readonly genres: string[];
  readonly cleanDescription?: string;

  // Derived lists
  readonly mainStudios: string[];
  readonly nonSpoilerTags: AnimeDetailTag[];
  readonly streamingLinks: AnimeDetailExternalLink[];
  readonly topRanking: AnimeDetailRanking | null;
}
