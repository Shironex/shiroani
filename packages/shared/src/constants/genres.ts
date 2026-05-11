/**
 * Canonical AniList anime genres.
 * Static list — stable, offline-safe, mirrors AniList's `GenreCollection`.
 */
export const ANIME_GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Ecchi',
  'Fantasy',
  'Horror',
  'Mahou Shoujo',
  'Mecha',
  'Music',
  'Mystery',
  'Psychological',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Sports',
  'Supernatural',
  'Thriller',
] as const;

export type AnimeGenre = (typeof ANIME_GENRES)[number];

/** Polish display labels for the genre picker UI */
export const ANIME_GENRE_LABELS_PL: Record<AnimeGenre, string> = {
  Action: 'Akcja',
  Adventure: 'Przygodowe',
  Comedy: 'Komedia',
  Drama: 'Dramat',
  Ecchi: 'Ecchi',
  Fantasy: 'Fantasy',
  Horror: 'Horror',
  'Mahou Shoujo': 'Mahou Shoujo',
  Mecha: 'Mecha',
  Music: 'Muzyczne',
  Mystery: 'Tajemnica',
  Psychological: 'Psychologiczne',
  Romance: 'Romans',
  'Sci-Fi': 'Sci-Fi',
  'Slice of Life': 'Slice of Life',
  Sports: 'Sportowe',
  Supernatural: 'Nadprzyrodzone',
  Thriller: 'Thriller',
};

/** English display labels for the genre picker UI */
export const ANIME_GENRE_LABELS_EN: Record<AnimeGenre, string> = {
  Action: 'Action',
  Adventure: 'Adventure',
  Comedy: 'Comedy',
  Drama: 'Drama',
  Ecchi: 'Ecchi',
  Fantasy: 'Fantasy',
  Horror: 'Horror',
  'Mahou Shoujo': 'Mahou Shoujo',
  Mecha: 'Mecha',
  Music: 'Music',
  Mystery: 'Mystery',
  Psychological: 'Psychological',
  Romance: 'Romance',
  'Sci-Fi': 'Sci-Fi',
  'Slice of Life': 'Slice of Life',
  Sports: 'Sports',
  Supernatural: 'Supernatural',
  Thriller: 'Thriller',
};

/**
 * Resolve a genre's display label for the active UI language. Falls back
 * to English when the language code isn't recognized — matches the
 * renderer's `DEFAULT_LANGUAGE` and keeps the picker readable for
 * unsupported locales.
 */
export function getAnimeGenreLabel(genre: AnimeGenre, lang: string): string {
  return lang === 'pl' ? ANIME_GENRE_LABELS_PL[genre] : ANIME_GENRE_LABELS_EN[genre];
}
