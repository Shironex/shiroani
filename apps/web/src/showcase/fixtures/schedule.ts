import type { AiringAnime } from '@shiroani/shared';
import { CATALOGUE, coverOf } from './catalogue';
import { dayOffsetOf, localDateKey, localMoment, unixAt } from './context';

/** Weekly slots, by weekday (0 = Sunday) and local airing time. */
const SLOTS: Array<{ titleId: number; weekday: number; hour: number; minute: number }> = [
  { titleId: 910001, weekday: 0, hour: 17, minute: 30 },
  { titleId: 910007, weekday: 0, hour: 21, minute: 0 },
  { titleId: 910011, weekday: 0, hour: 22, minute: 30 },
  { titleId: 910002, weekday: 1, hour: 18, minute: 0 },
  { titleId: 910013, weekday: 1, hour: 23, minute: 0 },
  { titleId: 910006, weekday: 2, hour: 17, minute: 0 },
  { titleId: 910015, weekday: 2, hour: 20, minute: 30 },
  { titleId: 910004, weekday: 3, hour: 19, minute: 30 },
  { titleId: 910009, weekday: 4, hour: 22, minute: 0 },
  { titleId: 910001, weekday: 5, hour: 18, minute: 30 },
  { titleId: 910013, weekday: 6, hour: 16, minute: 0 },
  { titleId: 910002, weekday: 6, hour: 20, minute: 0 },
  { titleId: 910006, weekday: 0, hour: 14, minute: 0 },
  { titleId: 910015, weekday: 0, hour: 11, minute: 30 },
  { titleId: 910002, weekday: 0, hour: 18, minute: 45 },
  { titleId: 910009, weekday: 0, hour: 23, minute: 30 },
];

/** Episode numbers advance one per week around a fixed anchor. */
function episodeFor(titleId: number, dayOffset: number): number {
  const base = 3 + (titleId % 5);
  return Math.max(1, base + Math.floor(dayOffset / 7));
}

function entriesForOffset(dayOffset: number): AiringAnime[] {
  const weekday = localMoment(dayOffset).getDay();
  return SLOTS.filter(slot => slot.weekday === weekday)
    .sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute))
    .map((slot, index) => {
      const title = CATALOGUE.find(t => t.id === slot.titleId);
      if (!title) throw new Error(`showcase: unknown schedule title ${slot.titleId}`);
      return {
        id: 800000 + (dayOffset + 30) * 20 + index,
        airingAt: unixAt(dayOffset, slot.hour, slot.minute),
        episode: episodeFor(title.id, dayOffset),
        media: {
          id: title.id,
          title: { english: title.english, romaji: title.romaji },
          coverImage: { large: coverOf(title), medium: coverOf(title) },
          episodes: title.episodes,
          status: 'RELEASING',
          format: title.format,
          genres: title.genres,
          averageScore: title.averageScore,
          popularity: title.popularity,
        },
      };
    });
}

export function dailySchedule(date: string): { date: string; entries: AiringAnime[] } {
  return { date, entries: entriesForOffset(dayOffsetOf(date)) };
}

export function weeklySchedule(startDate: string): { schedule: Record<string, AiringAnime[]> } {
  const start = dayOffsetOf(startDate);
  const schedule: Record<string, AiringAnime[]> = {};
  for (let i = 0; i < 7; i++) {
    schedule[localDateKey(localMoment(start + i))] = entriesForOffset(start + i);
  }
  return { schedule };
}
