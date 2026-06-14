import type { DiscoverMedia } from '@/stores/useDiscoverStore';
import {
  getAnilistFormatLabel,
  getAnilistStatusLabel,
  getAnilistSeasonLabel,
} from '@/lib/constants';
import { stripHtml } from '@/lib/html-text';

export { stripHtml };

export function getTitle(t: DiscoverMedia['title']): string {
  return t.english || t.romaji || t.native || '?';
}

export interface IShowcaseMeta {
  cover?: string;
  banner?: string;
  title: string;
  formatLabel: string | null;
  statusLabel: string | null;
  yearLabel: string | null;
  synopsis: string;
}

export function buildShowcaseMeta(media: DiscoverMedia): IShowcaseMeta {
  const cover = media.coverImage.extraLarge || media.coverImage.large || media.coverImage.medium;
  const banner = media.bannerImage || cover;
  const formatLabel = media.format ? getAnilistFormatLabel(media.format) : null;
  const statusLabel = media.status ? getAnilistStatusLabel(media.status) : null;
  const yearLabel =
    media.seasonYear && media.season
      ? `${getAnilistSeasonLabel(media.season)} ${media.seasonYear}`
      : media.seasonYear
        ? String(media.seasonYear)
        : null;

  return {
    cover,
    banner,
    title: getTitle(media.title),
    formatLabel,
    statusLabel,
    yearLabel,
    synopsis: stripHtml(media.description),
  };
}
