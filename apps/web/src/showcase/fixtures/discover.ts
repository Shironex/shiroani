import type { DiscoverMedia } from '@shiroani/shared';
import { bannerArt } from './art';
import { CATALOGUE, coverOf, type IShowcaseTitle } from './catalogue';
import { unixAt } from './context';

function toMedia(title: IShowcaseTitle, index: number): DiscoverMedia {
  const cover = coverOf(title);
  return {
    id: title.id,
    title: { english: title.english, romaji: title.romaji },
    coverImage: { large: cover, medium: cover, extraLarge: cover },
    bannerImage: bannerArt(index),
    episodes: title.episodes,
    status: title.status,
    format: title.format,
    genres: title.genres,
    averageScore: title.averageScore,
    popularity: title.popularity,
    season: title.season,
    seasonYear: title.seasonYear,
    nextAiringEpisode:
      title.status === 'RELEASING'
        ? { airingAt: unixAt(1 + (index % 6), 20, 0), episode: 4 + (index % 6) }
        : undefined,
    description: title.description,
  };
}

type DiscoverOrder = 'trending' | 'popular' | 'seasonal' | 'random';

function ordered(order: DiscoverOrder): IShowcaseTitle[] {
  switch (order) {
    case 'popular':
      return [...CATALOGUE].sort((a, b) => b.popularity - a.popularity);
    case 'seasonal':
      return CATALOGUE.filter(t => t.season === 'FALL' && t.seasonYear === 2026);
    case 'random':
      return [...CATALOGUE].reverse();
    case 'trending':
    default:
      return [...CATALOGUE].sort((a, b) => b.averageScore - a.averageScore);
  }
}

export function discoverPage(order: DiscoverOrder): {
  results: DiscoverMedia[];
  pageInfo: { total: number; currentPage: number; lastPage: number; hasNextPage: boolean };
} {
  const results = ordered(order).map(toMedia);
  return {
    results,
    pageInfo: { total: results.length, currentPage: 1, lastPage: 1, hasNextPage: false },
  };
}
