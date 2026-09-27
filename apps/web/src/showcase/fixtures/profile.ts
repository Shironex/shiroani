import type {
  AniListActivity,
  AniListAuthStatus,
  AppStatsSnapshot,
  UserProfile,
} from '@shiroani/shared';
import { avatarArt, bannerArt, coverArt } from './art';
import { CATALOGUE, coverOf, titleById } from './catalogue';
import { localDateKey, localMoment } from './context';

/** The invented account every connected-state view shows. */
export const VIEWER = {
  id: 424242,
  name: 'Mochiko',
  avatar: avatarArt(4, 'M'),
  bannerImage: bannerArt(7),
};

export function aniListStatus(): AniListAuthStatus {
  return {
    connected: true,
    viewer: VIEWER,
    expiresAt: Math.floor(localMoment(300).getTime() / 1000),
  };
}

function stat(name: string, count: number, meanScore: number, minutesWatched: number) {
  return { name, count, meanScore, minutesWatched };
}

export function viewerProfile(): UserProfile {
  return {
    id: VIEWER.id,
    name: VIEWER.name,
    avatar: VIEWER.avatar,
    bannerImage: VIEWER.bannerImage,
    about: undefined,
    siteUrl: undefined,
    createdAt: Math.floor(localMoment(-1460).getTime() / 1000),
    statistics: {
      count: 268,
      meanScore: 7.9,
      standardDeviation: 1.3,
      minutesWatched: 161_280,
      episodesWatched: 3_640,
      genres: [
        stat('Slice of Life', 92, 82, 44_000),
        stat('Comedy', 81, 77, 38_500),
        stat('Fantasy', 64, 80, 31_200),
        stat('Drama', 52, 83, 27_900),
        stat('Mystery', 33, 81, 16_400),
        stat('Sports', 21, 84, 10_200),
      ],
      formats: [
        stat('TV', 214, 79, 142_000),
        stat('MOVIE', 29, 84, 11_600),
        stat('OVA', 25, 76, 7_680),
      ],
      statuses: [
        stat('COMPLETED', 196, 80, 138_000),
        stat('CURRENT', 18, 82, 9_300),
        stat('PLANNING', 37, 0, 0),
        stat('PAUSED', 9, 71, 4_200),
        stat('DROPPED', 8, 54, 1_900),
      ],
      scores: [
        { score: 60, count: 14, meanScore: 60 },
        { score: 70, count: 48, meanScore: 70 },
        { score: 80, count: 86, meanScore: 80 },
        { score: 90, count: 41, meanScore: 90 },
        { score: 100, count: 12, meanScore: 100 },
      ],
      releaseYears: [
        { year: 2026, count: 38, meanScore: 82 },
        { year: 2025, count: 51, meanScore: 80 },
        { year: 2024, count: 47, meanScore: 78 },
        { year: 2023, count: 40, meanScore: 79 },
      ],
      studios: [
        stat('Studio Kumoji', 24, 83, 12_400),
        stat('Lantern Works', 19, 80, 9_800),
        stat('Hakumei Animation', 15, 84, 7_700),
        stat('Paperplane Studio', 11, 86, 5_300),
      ],
      tags: [
        { name: 'Found Family', count: 44, meanScore: 83 },
        { name: 'Iyashikei', count: 38, meanScore: 84 },
        { name: 'Small Town', count: 27, meanScore: 81 },
      ],
    },
    favourites: [910008, 910001, 910003, 910012].map(id => {
      const title = titleById(id);
      return {
        id: title.id,
        title: { english: title.english, romaji: title.romaji },
        coverImage: coverOf(title),
      };
    }),
    favouritesManga: [],
    favouritesCharacters: [
      { id: 930001, name: 'Tomo the Lamplighter', image: coverArt(11) },
      { id: 930002, name: 'Captain Hasami', image: coverArt(12) },
    ],
    favouritesStaff: [],
    favouritesStudios: [
      { id: 940001, name: 'Studio Kumoji' },
      { id: 940002, name: 'Paperplane Studio' },
    ],
  };
}

export function viewerActivity(): { activities: AniListActivity[] } {
  const rows: Array<{ id: number; status: string; progress?: string; hoursAgo: number }> = [
    { id: 910001, status: 'watched episode', progress: '7', hoursAgo: 1 },
    { id: 910007, status: 'watched episode', progress: '5', hoursAgo: 26 },
    { id: 910008, status: 'completed', hoursAgo: 60 },
    { id: 910011, status: 'watched episode', progress: '2 - 3', hoursAgo: 75 },
    { id: 910016, status: 'plans to watch', hoursAgo: 98 },
  ];
  const now = localMoment(0, 19, 0).getTime();
  return {
    activities: rows.map((row, index) => {
      const title = CATALOGUE.find(t => t.id === row.id) ?? titleById(910001);
      return {
        type: 'list',
        id: 950000 + index,
        status: row.status,
        progress: row.progress,
        media: {
          id: title.id,
          title: { english: title.english, romaji: title.romaji },
          coverImage: coverOf(title),
        },
        createdAt: Math.floor((now - row.hoursAgo * 3_600_000) / 1000),
      };
    }),
  };
}

export function appStatsSnapshot(): AppStatsSnapshot {
  const byDay: AppStatsSnapshot['byDay'] = {};
  for (let daysAgo = 0; daysAgo < 120; daysAgo++) {
    const weight = (daysAgo * 7 + 3) % 11;
    if (weight < 3) continue;
    const minutes = weight * 14;
    byDay[localDateKey(localMoment(-daysAgo))] = {
      appOpenSeconds: minutes * 90,
      appActiveSeconds: minutes * 60,
      animeWatchSeconds: minutes * 45,
      longestSessionSeconds: minutes * 30,
    };
  }
  const today = localDateKey(localMoment(0));
  return {
    version: 1,
    createdAt: localMoment(-400).toISOString(),
    totals: {
      appOpenSeconds: 1_296_000,
      appActiveSeconds: 864_000,
      animeWatchSeconds: 612_000,
      sessionCount: 318,
    },
    byDay,
    currentStreak: { days: 6, lastDay: today },
    longestStreak: { days: 23, lastDay: localDateKey(localMoment(-48)) },
  };
}
