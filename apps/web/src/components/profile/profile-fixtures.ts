import type { AppStatsSnapshot, MalUserStats, UserProfile } from '@shiroani/shared';

/**
 * Minimal-but-complete {@link UserProfile} fixture for profile stories and
 * tests. Store/socket-free — every field is a literal so stories stay
 * deterministic and render the full dashboard surface without a backend.
 */
export const mockUserProfile: UserProfile = {
  id: 1,
  name: 'Yor',
  avatar: undefined,
  siteUrl: 'https://anilist.co/user/Yor',
  createdAt: 1609459200,
  statistics: {
    count: 312,
    meanScore: 7.8,
    standardDeviation: 1.4,
    minutesWatched: 187200,
    episodesWatched: 4210,
    genres: [
      { name: 'Action', count: 120, meanScore: 78, minutesWatched: 60000 },
      { name: 'Drama', count: 86, meanScore: 81, minutesWatched: 44000 },
      { name: 'Comedy', count: 64, meanScore: 75, minutesWatched: 30000 },
      { name: 'Romance', count: 40, meanScore: 72, minutesWatched: 18000 },
      { name: 'Fantasy', count: 22, meanScore: 80, minutesWatched: 12000 },
    ],
    formats: [{ name: 'TV', count: 200, meanScore: 78, minutesWatched: 120000 }],
    statuses: [
      { name: 'COMPLETED', count: 220, meanScore: 79, minutesWatched: 150000 },
      { name: 'CURRENT', count: 24, meanScore: 80, minutesWatched: 9000 },
      { name: 'PLANNING', count: 48, meanScore: 0, minutesWatched: 0 },
      { name: 'PAUSED', count: 12, meanScore: 70, minutesWatched: 5000 },
      { name: 'DROPPED', count: 8, meanScore: 55, minutesWatched: 2000 },
    ],
    scores: [
      { score: 70, count: 40, meanScore: 70 },
      { score: 80, count: 80, meanScore: 80 },
      { score: 90, count: 30, meanScore: 90 },
    ],
    releaseYears: [
      { year: 2023, count: 60, meanScore: 80 },
      { year: 2022, count: 48, meanScore: 78 },
    ],
    studios: [
      { name: 'MAPPA', count: 32, meanScore: 82, minutesWatched: 20000 },
      { name: 'Wit Studio', count: 18, meanScore: 80, minutesWatched: 11000 },
      { name: 'Bones', count: 12, meanScore: 79, minutesWatched: 8000 },
      { name: 'Ufotable', count: 9, meanScore: 85, minutesWatched: 6000 },
    ],
    tags: [{ name: 'Female Protagonist', count: 40, meanScore: 80 }],
  },
  favourites: [
    {
      id: 101,
      title: { english: 'Spy x Family', romaji: 'Spy x Family' },
      coverImage: undefined,
    },
  ],
  favouritesManga: [],
  favouritesCharacters: [{ id: 201, name: 'Anya Forger', image: undefined }],
  favouritesStaff: [],
  favouritesStudios: [{ id: 301, name: 'Wit Studio' }],
};

/**
 * App-stats snapshot fixture with a couple of populated day buckets, so the
 * heatmap renders non-empty cells deterministically without the desktop
 * tracker. Day keys are relative to "today" at module load.
 */
function recentDayKey(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString('sv-SE');
}

export const mockAppStatsSnapshot: AppStatsSnapshot = {
  version: 1,
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  totals: {
    appOpenSeconds: 540_000,
    appActiveSeconds: 360_000,
    animeWatchSeconds: 180_000,
    sessionCount: 42,
  },
  byDay: {
    [recentDayKey(0)]: {
      appOpenSeconds: 7200,
      appActiveSeconds: 5400,
      animeWatchSeconds: 3600,
      longestSessionSeconds: 5400,
    },
    [recentDayKey(1)]: {
      appOpenSeconds: 3600,
      appActiveSeconds: 1800,
      animeWatchSeconds: 900,
      longestSessionSeconds: 1800,
    },
    [recentDayKey(3)]: {
      appOpenSeconds: 1800,
      appActiveSeconds: 900,
      animeWatchSeconds: 600,
      longestSessionSeconds: 900,
    },
  },
  currentStreak: { days: 2, lastDay: recentDayKey(0) },
  longestStreak: { days: 9, lastDay: recentDayKey(0) },
};

/**
 * Statistics with the OPTIONAL richer arrays populated (voice actors / staff /
 * start years / episode lengths), for the {@link ProfileExtraStats} surface.
 */
export const mockExtraStats: UserProfile['statistics'] = {
  ...mockUserProfile.statistics,
  voiceActors: [
    { name: 'Saori Hayami', count: 18, meanScore: 82, minutesWatched: 9000 },
    { name: 'Yoshitsugu Matsuoka', count: 14, meanScore: 79, minutesWatched: 7000 },
  ],
  staff: [{ name: 'Hayao Miyazaki', count: 6, meanScore: 90, minutesWatched: 3000 }],
  startYears: [
    { value: 2023, count: 40, meanScore: 80, minutesWatched: 20000 },
    { value: 2022, count: 30, meanScore: 78, minutesWatched: 15000 },
  ],
  lengths: [{ value: '13', count: 50, meanScore: 80, minutesWatched: 25000 }],
};

/** A connected MAL viewer's stats for the {@link MalStatsPanel} surface. */
export const mockMalStats: MalUserStats = {
  viewer: { id: 7, name: 'Yor' },
  num_items_watching: 18,
  num_items_completed: 220,
  num_items_on_hold: 6,
  num_items_dropped: 9,
  num_items_plan_to_watch: 40,
  num_items: 293,
  num_days_watched: 52.3,
  num_days_watching: 4.1,
  num_days_completed: 44.0,
  num_days_on_hold: 1.2,
  num_days_dropped: 3.0,
  num_days: 52.3,
  num_episodes: 4210,
  num_times_rewatched: 12,
  mean_score: 7.84,
};
