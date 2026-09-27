import type { AnimeEntry, AnimeStatus } from '@shiroani/shared';
import { CATALOGUE, coverOf } from './catalogue';
import { isoAt, pick } from './context';

interface ILibraryRow {
  titleId: number;
  status: AnimeStatus;
  currentEpisode: number;
  score?: number;
  addedDaysAgo: number;
  notes?: { en: string; pl: string };
}

const ROWS: ILibraryRow[] = [
  { titleId: 910001, status: 'watching', currentEpisode: 7, score: 9, addedDaysAgo: 40 },
  { titleId: 910002, status: 'watching', currentEpisode: 11, score: 8, addedDaysAgo: 35 },
  { titleId: 910007, status: 'watching', currentEpisode: 5, addedDaysAgo: 21 },
  { titleId: 910006, status: 'watching', currentEpisode: 6, score: 8, addedDaysAgo: 19 },
  { titleId: 910011, status: 'watching', currentEpisode: 3, addedDaysAgo: 9 },
  {
    titleId: 910008,
    status: 'completed',
    currentEpisode: 11,
    score: 10,
    addedDaysAgo: 210,
    notes: {
      en: 'Episode 9 is the best single episode I watched this year.',
      pl: 'Odcinek 9 to najlepszy odcinek, jaki widziałam w tym roku.',
    },
  },
  { titleId: 910003, status: 'completed', currentEpisode: 13, score: 9, addedDaysAgo: 95 },
  { titleId: 910005, status: 'completed', currentEpisode: 24, score: 7, addedDaysAgo: 150 },
  { titleId: 910012, status: 'completed', currentEpisode: 1, score: 9, addedDaysAgo: 300 },
  { titleId: 910014, status: 'completed', currentEpisode: 12, score: 8, addedDaysAgo: 120 },
  { titleId: 910009, status: 'on_hold', currentEpisode: 4, addedDaysAgo: 28 },
  { titleId: 910010, status: 'dropped', currentEpisode: 6, score: 5, addedDaysAgo: 70 },
  { titleId: 910004, status: 'plan_to_watch', currentEpisode: 0, addedDaysAgo: 6 },
  { titleId: 910013, status: 'plan_to_watch', currentEpisode: 0, addedDaysAgo: 4 },
  { titleId: 910015, status: 'plan_to_watch', currentEpisode: 0, addedDaysAgo: 3 },
  { titleId: 910016, status: 'plan_to_watch', currentEpisode: 0, addedDaysAgo: 2 },
];

export function libraryEntries(): AnimeEntry[] {
  return ROWS.map((row, index) => {
    const title = CATALOGUE.find(t => t.id === row.titleId);
    if (!title) throw new Error(`showcase: unknown library title ${row.titleId}`);
    return {
      id: index + 1,
      anilistId: title.id,
      title: title.english,
      titleRomaji: title.romaji,
      coverImage: coverOf(title),
      episodes: title.episodes,
      status: row.status,
      currentEpisode: row.currentEpisode,
      score: row.score,
      notes: row.notes ? pick(row.notes) : undefined,
      resumeUrl:
        row.status === 'watching'
          ? `https://kumo-stream.example/watch/${title.id}/${row.currentEpisode + 1}`
          : undefined,
      addedAt: isoAt(-row.addedDaysAgo, 20, 15),
      updatedAt: isoAt(-Math.min(row.addedDaysAgo, index % 5), 17, 30),
      anilistSyncedAt: new Date(isoAt(0, 18, 30)).getTime(),
      synced: true,
      malId: null,
      malSyncedAt: null,
      malSynced: false,
    };
  });
}
