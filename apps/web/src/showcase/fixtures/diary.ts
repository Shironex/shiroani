import type { DiaryEntry, DiaryGradient, DiaryMood } from '@shiroani/shared';
import { titleById, coverOf } from './catalogue';
import { isoAt, pick } from './context';

interface IDiarySeed {
  title: { en: string; pl: string };
  paragraphs: { en: string[]; pl: string[] };
  gradient: DiaryGradient;
  mood: DiaryMood;
  tags: { en: string[]; pl: string[] };
  animeId?: number;
  pinned: boolean;
  daysAgo: number;
}

const SEEDS: IDiarySeed[] = [
  {
    title: { en: 'The lantern festival episode', pl: 'Odcinek z festiwalem latarni' },
    paragraphs: {
      en: [
        'Episode 7 finally showed the whole town lighting the lanterns at once. I paused it just to look at the background art.',
        'Rewatching the first episode next weekend to catch the foreshadowing.',
      ],
      pl: [
        'W 7. odcinku całe miasto w końcu zapaliło latarnie naraz. Zatrzymałam odcinek tylko po to, żeby popatrzeć na tła.',
        'W przyszły weekend wracam do pierwszego odcinka, żeby wyłapać zapowiedzi.',
      ],
    },
    gradient: 'twilight',
    mood: 'great',
    tags: { en: ['favourite', 'rewatch'], pl: ['ulubione', 'powtórka'] },
    animeId: 910001,
    pinned: true,
    daysAgo: 0,
  },
  {
    title: { en: 'Relay night', pl: 'Nocna sztafeta' },
    paragraphs: {
      en: ['The anchor leg was animated in one long take. Still thinking about it.'],
      pl: ['Ostatnia zmiana sztafety była animowana jednym długim ujęciem. Nadal o tym myślę.'],
    },
    gradient: 'ocean',
    mood: 'good',
    tags: { en: ['sports'], pl: ['sport'] },
    animeId: 910007,
    pinned: false,
    daysAgo: 2,
  },
  {
    title: { en: 'Autumn season plan', pl: 'Plan na jesienny sezon' },
    paragraphs: {
      en: [
        'Keeping it to five shows this time: Hoshizora, Paper Crane, Moonlight Relay, Tidepool and Foxfire.',
        'Everything else goes on the plan-to-watch shelf.',
      ],
      pl: [
        'Tym razem tylko pięć serii: Hoshizora, Paper Crane, Moonlight Relay, Tidepool i Foxfire.',
        'Reszta ląduje na półce z planami.',
      ],
    },
    gradient: 'amber',
    mood: 'neutral',
    tags: { en: ['planning'], pl: ['plany'] },
    pinned: false,
    daysAgo: 5,
  },
  {
    title: { en: 'Snowfield Signal finale', pl: 'Finał Snowfield Signal' },
    paragraphs: {
      en: ['That last radio message. No spoilers here, but wow.'],
      pl: ['Ta ostatnia wiadomość przez radio. Bez spoilerów, ale wow.'],
    },
    gradient: 'mist',
    mood: 'great',
    tags: { en: ['finale'], pl: ['finał'] },
    animeId: 910008,
    pinned: false,
    daysAgo: 12,
  },
  {
    title: { en: 'Dropped Violet Harbor', pl: 'Porzucone Violet Harbor' },
    paragraphs: {
      en: ['Six episodes in and the lighthouse club still has not visited the lighthouse.'],
      pl: ['Sześć odcinków, a klub latarni wciąż nie odwiedził latarni.'],
    },
    gradient: 'lavender',
    mood: 'bad',
    tags: { en: ['dropped'], pl: ['porzucone'] },
    animeId: 910010,
    pinned: false,
    daysAgo: 20,
  },
];

function toDoc(paragraphs: string[]): string {
  return JSON.stringify({
    type: 'doc',
    content: paragraphs.map(text => ({ type: 'paragraph', content: [{ type: 'text', text }] })),
  });
}

export function diaryEntries(): DiaryEntry[] {
  return SEEDS.map((seed, index) => {
    const anime = seed.animeId ? titleById(seed.animeId) : undefined;
    return {
      id: index + 1,
      title: pick(seed.title),
      contentJson: toDoc(pick(seed.paragraphs)),
      coverGradient: seed.gradient,
      mood: seed.mood,
      tags: pick(seed.tags),
      animeId: anime?.id,
      animeTitle: anime?.english,
      animeCoverImage: anime ? coverOf(anime) : undefined,
      isPinned: seed.pinned,
      createdAt: isoAt(-seed.daysAgo, 18, 20),
      updatedAt: isoAt(-seed.daysAgo, 18, 40),
    };
  });
}
